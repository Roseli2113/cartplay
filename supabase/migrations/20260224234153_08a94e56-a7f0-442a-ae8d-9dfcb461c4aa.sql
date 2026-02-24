
-- Update handle_new_user to NOT create trial subscription anymore
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- New users start with inactive subscription, must pay to access
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'none', 'inactive');
  
  RETURN NEW;
END;
$function$;
