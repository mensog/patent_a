-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Companies RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can update own company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid())
  );