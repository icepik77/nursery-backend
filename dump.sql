--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: medical_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.medical_category AS ENUM (
    'vaccination',
    'treatment',
    'surgery',
    'other'
);


ALTER TYPE public.medical_category OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: pet_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pet_id uuid NOT NULL,
    title text NOT NULL,
    event_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


ALTER TABLE public.pet_events OWNER TO postgres;

--
-- Name: pet_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pet_id uuid NOT NULL,
    name text NOT NULL,
    uri text NOT NULL,
    type text,
    size bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


ALTER TABLE public.pet_files OWNER TO postgres;

--
-- Name: pet_medical; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_medical (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pet_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone,
    category public.medical_category DEFAULT 'other'::public.medical_category NOT NULL
);


ALTER TABLE public.pet_medical OWNER TO postgres;

--
-- Name: pet_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pet_id uuid NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


ALTER TABLE public.pet_notes OWNER TO postgres;

--
-- Name: pets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text,
    gender text,
    birthdate date,
    chip text,
    breed text,
    weight numeric,
    height numeric,
    color text,
    note text,
    imageuri text,
    bignote text,
    category text,
    pasportname text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.pets OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    created_at timestamp without time zone DEFAULT now(),
    login text,
    avatar text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: pet_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pet_events (id, pet_id, title, event_date, created_at, updated_at) FROM stdin;
79613429-7dac-482c-b7ad-e12a7079b953	3bead518-298a-45c9-aa28-2cc4cf01dd50	323	2025-09-03	2025-09-02 11:52:36.542	\N
6dbeb300-64dc-43ec-8e48-1018a4aa9ce1	7932e552-469a-4588-accb-fb885df7e0e8	Прививка 1	2025-09-04	2025-09-02 12:01:32.993	\N
\.


--
-- Data for Name: pet_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pet_files (id, pet_id, name, uri, type, size, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pet_medical; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pet_medical (id, pet_id, title, content, created_at, updated_at, category) FROM stdin;
a3a23415-2086-4090-97fe-62dc067591cb	3bead518-298a-45c9-aa28-2cc4cf01dd50	вы	ыв	2025-09-01 13:16:42.673	\N	vaccination
925f4bfc-c7a3-46b7-af31-e4dd0900ae99	3bead518-298a-45c9-aa28-2cc4cf01dd50	43	1ы	2025-09-01 13:29:25.045	\N	surgery
c886ea8d-14d5-46ea-a550-523a821b8a3f	7932e552-469a-4588-accb-fb885df7e0e8	Прививка 2	Текст прививка 	2025-09-02 12:55:15.764	\N	treatment
\.


--
-- Data for Name: pet_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pet_notes (id, pet_id, text, created_at, updated_at) FROM stdin;
786cccbc-4cda-474c-bc01-e9bb281d59e2	3bead518-298a-45c9-aa28-2cc4cf01dd50	ыава	2025-08-31 16:42:50.431	2025-09-01 13:31:14.888891
\.


--
-- Data for Name: pets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pets (id, user_id, name, gender, birthdate, chip, breed, weight, height, color, note, imageuri, bignote, category, pasportname, created_at) FROM stdin;
7932e552-469a-4588-accb-fb885df7e0e8	9db2ae8b-cf43-400f-9c07-b33823be549c	Барсик 	мужской	2025-09-01	\N	\N	14.3	\N	\N	\N	\N	\N	крупные животные	\N	2025-09-01 23:58:50.986
3bead518-298a-45c9-aa28-2cc4cf01dd50	76ba2816-46b8-4c3c-9970-5c841724b163	Ляля	женский	\N	\N	\N	\N	\N	\N	\N	\N	\N	крупные животные	\N	2025-08-31 09:49:15.898
0a2c58d9-0b13-4893-b322-8b299bad6354	76ba2816-46b8-4c3c-9970-5c841724b163	Ляля2	женский	\N	\N	\N	\N	\N	\N	\N	\N	\N	крупные животные	\N	2025-08-31 06:49:15.898
550745af-ad8d-439e-8769-0e06edbd46f4	76ba2816-46b8-4c3c-9970-5c841724b163	123213	женский	2025-08-05	\N	\N	\N	\N	\N	\N	\N	\N	крупные животные	\N	2025-08-31 06:49:15.898
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, name, created_at, login, avatar, updated_at) FROM stdin;
9db2ae8b-cf43-400f-9c07-b33823be549c	icepik777@mail.ru	$2b$10$9SwR3LftxYDCFGUJqbC/VellTJ41CoiFz1n2TYPfTywPkw9ZbHT5C	\N	2025-09-01 16:21:20.927649	rer	\N	2025-09-01 16:21:20.927649
76ba2816-46b8-4c3c-9970-5c841724b163	icepik77@mail.ru	$2b$10$YldMUM4JUy8yESnUXyTjzesMpkZj/xl9dYg7DpYOAy7YzSK3kBGze	\N	2025-08-31 15:49:01.731295	icepik	\N	2025-09-01 13:45:40.806838
\.


--
-- Name: pet_events pet_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_events
    ADD CONSTRAINT pet_events_pkey PRIMARY KEY (id);


--
-- Name: pet_files pet_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_files
    ADD CONSTRAINT pet_files_pkey PRIMARY KEY (id);


--
-- Name: pet_medical pet_medical_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_medical
    ADD CONSTRAINT pet_medical_pkey PRIMARY KEY (id);


--
-- Name: pet_notes pet_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_notes
    ADD CONSTRAINT pet_notes_pkey PRIMARY KEY (id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: pet_events pet_events_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_events
    ADD CONSTRAINT pet_events_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_files pet_files_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_files
    ADD CONSTRAINT pet_files_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_medical pet_medical_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_medical
    ADD CONSTRAINT pet_medical_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_notes pet_notes_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_notes
    ADD CONSTRAINT pet_notes_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pets pets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

