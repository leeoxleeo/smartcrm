-- Criar usuário admin: leonardo.caps@gmail.com / admin
-- Execute no SQL Editor do Supabase

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verifica se o usuário já existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'leonardo.caps@gmail.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- 1. Cria o usuário em auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'leonardo.caps@gmail.com',
      crypt('admin', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"nome":"Leonardo"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );

    -- 2. Cria a identidade (necessário para auth funcionar)
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', 'leonardo.caps@gmail.com'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Usuário criado: %', v_user_id;
  ELSE
    -- Atualiza a senha
    UPDATE auth.users
    SET
      encrypted_password = crypt('admin', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Senha atualizada: %', v_user_id;
  END IF;

  -- 3. Upsert do perfil como admin
  INSERT INTO perfis (id, nome, email, role, ativo)
  VALUES (v_user_id, 'Leonardo', 'leonardo.caps@gmail.com', 'admin', true)
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        ativo = true;

  RAISE NOTICE 'Pronto — perfil admin configurado.';
END $$;
