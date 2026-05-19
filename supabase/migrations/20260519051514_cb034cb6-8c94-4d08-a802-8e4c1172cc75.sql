
-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  balance BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  memo TEXT,
  created_by_nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.restaurants(team_id);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  actor_nickname TEXT NOT NULL,
  actor_mode TEXT NOT NULL CHECK (actor_mode IN ('manager','member')),
  type TEXT NOT NULL CHECK (type IN ('charge','spend','adjust','cancel')),
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transactions(team_id, created_at DESC);
CREATE INDEX ON public.transactions(restaurant_id, created_at DESC);
CREATE INDEX ON public.transactions(actor_nickname);

-- RLS: open access (no auth in this app)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- charge_restaurant
CREATE OR REPLACE FUNCTION public.charge_restaurant(
  p_restaurant_id UUID,
  p_amount BIGINT,
  p_actor_nickname TEXT,
  p_memo TEXT DEFAULT NULL
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.restaurants;
  new_balance BIGINT;
  tx public.transactions;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION '충전 금액은 0보다 커야 합니다.';
  END IF;

  SELECT * INTO r FROM public.restaurants WHERE id = p_restaurant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '식당을 찾을 수 없습니다.';
  END IF;

  new_balance := r.balance + p_amount;
  UPDATE public.restaurants SET balance = new_balance WHERE id = r.id;

  INSERT INTO public.transactions
    (team_id, restaurant_id, actor_nickname, actor_mode, type, amount, balance_after, memo)
  VALUES
    (r.team_id, r.id, p_actor_nickname, 'manager', 'charge', p_amount, new_balance, p_memo)
  RETURNING * INTO tx;

  RETURN tx;
END; $$;

-- spend_restaurant (마이너스 잔액 허용)
CREATE OR REPLACE FUNCTION public.spend_restaurant(
  p_restaurant_id UUID,
  p_amount BIGINT,
  p_actor_nickname TEXT,
  p_memo TEXT DEFAULT NULL
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.restaurants;
  new_balance BIGINT;
  tx public.transactions;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION '금액은 0보다 커야 합니다.';
  END IF;

  SELECT * INTO r FROM public.restaurants WHERE id = p_restaurant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '식당을 찾을 수 없습니다.';
  END IF;

  IF r.status <> 'active' THEN
    RAISE EXCEPTION '사용할 수 없는 식당입니다.';
  END IF;

  new_balance := r.balance - p_amount;
  UPDATE public.restaurants SET balance = new_balance WHERE id = r.id;

  INSERT INTO public.transactions
    (team_id, restaurant_id, actor_nickname, actor_mode, type, amount, balance_after, memo)
  VALUES
    (r.team_id, r.id, p_actor_nickname, 'member', 'spend', p_amount, new_balance, p_memo)
  RETURNING * INTO tx;

  RETURN tx;
END; $$;
