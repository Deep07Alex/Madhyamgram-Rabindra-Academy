--
-- PostgreSQL database dump
--

\restrict cEJvi6uwDBS2COimy1NFx5jIjuPz6nFbUUIpmUe5cr3KoBExqwkwuzLlEx71AkK

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE'
);


ALTER TYPE public."AttendanceStatus" OWNER TO postgres;

--
-- Name: FeeStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FeeStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIAL'
);


ALTER TYPE public."FeeStatus" OWNER TO postgres;

--
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubmissionStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'GRADED'
);


ALTER TYPE public."SubmissionStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admin" (
    id text NOT NULL,
    "adminId" text NOT NULL,
    username text,
    password text NOT NULL,
    name text NOT NULL,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Admin" OWNER TO postgres;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."AttendanceStatus" NOT NULL,
    "studentId" text NOT NULL,
    "teacherId" text NOT NULL,
    "classId" text NOT NULL,
    subject text
);


ALTER TABLE public."Attendance" OWNER TO postgres;

--
-- Name: Class; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Class" (
    id text NOT NULL,
    name text NOT NULL,
    grade integer NOT NULL
);


ALTER TABLE public."Class" OWNER TO postgres;

--
-- Name: Fee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Fee" (
    id text NOT NULL,
    amount double precision NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    status public."FeeStatus" DEFAULT 'PENDING'::public."FeeStatus" NOT NULL,
    type text NOT NULL,
    "paymentMethod" text,
    "transactionId" text,
    "studentId" text NOT NULL,
    remark text
);


ALTER TABLE public."Fee" OWNER TO postgres;

--
-- Name: Gallery; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Gallery" (
    id text NOT NULL,
    title text NOT NULL,
    "imageUrl" text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Gallery" OWNER TO postgres;

--
-- Name: Homework; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Homework" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    subject text,
    "fileUrl" text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "teacherId" text NOT NULL,
    "classId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Homework" OWNER TO postgres;

--
-- Name: Result; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Result" (
    id text NOT NULL,
    semester text NOT NULL,
    subject text NOT NULL,
    marks double precision NOT NULL,
    "totalMarks" double precision NOT NULL,
    grade text,
    "studentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Result" OWNER TO postgres;

--
-- Name: Student; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Student" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    email text,
    "rollNumber" text NOT NULL,
    "classId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Student" OWNER TO postgres;

--
-- Name: Submission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Submission" (
    id text NOT NULL,
    content text,
    "fileUrl" text,
    status public."SubmissionStatus" DEFAULT 'PENDING'::public."SubmissionStatus" NOT NULL,
    "studentId" text NOT NULL,
    "homeworkId" text NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Submission" OWNER TO postgres;

--
-- Name: Teacher; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teacher" (
    id text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    email text,
    "teacherId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Teacher" OWNER TO postgres;

--
-- Name: TeacherAttendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TeacherAttendance" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."AttendanceStatus" NOT NULL,
    "teacherId" text NOT NULL
);


ALTER TABLE public."TeacherAttendance" OWNER TO postgres;

--
-- Name: _ClassToTeacher; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_ClassToTeacher" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_ClassToTeacher" OWNER TO postgres;

--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admin" (id, "adminId", username, password, name, email, "createdAt", "updatedAt") FROM stdin;
28bf7bb7-9fe1-45a5-9352-eec9bdf00d24	8100474669	aritrada420	$2b$10$Z7qqcHuHmteO3ZRQ3rtrg.rCfkVbNRs1PK5KqxAg3bdtuETa8IwhC	Aritra Dutta	aritradatt39@gmail.com	2026-03-01 03:31:42.044	2026-03-01 03:31:42.044
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Attendance" (id, date, status, "studentId", "teacherId", "classId", subject) FROM stdin;
\.


--
-- Data for Name: Class; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Class" (id, name, grade) FROM stdin;
\.


--
-- Data for Name: Fee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Fee" (id, amount, "dueDate", "paidAt", status, type, "paymentMethod", "transactionId", "studentId", remark) FROM stdin;
\.


--
-- Data for Name: Gallery; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Gallery" (id, title, "imageUrl", description, "createdAt") FROM stdin;
\.


--
-- Data for Name: Homework; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Homework" (id, title, description, subject, "fileUrl", "dueDate", "teacherId", "classId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Result; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Result" (id, semester, subject, marks, "totalMarks", grade, "studentId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Student" (id, "studentId", password, name, email, "rollNumber", "classId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Submission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Submission" (id, content, "fileUrl", status, "studentId", "homeworkId", "submittedAt") FROM stdin;
\.


--
-- Data for Name: Teacher; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Teacher" (id, password, name, email, "teacherId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TeacherAttendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TeacherAttendance" (id, date, status, "teacherId") FROM stdin;
\.


--
-- Data for Name: _ClassToTeacher; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_ClassToTeacher" ("A", "B") FROM stdin;
\.


--
-- Name: Admin Admin_adminId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_adminId_key" UNIQUE ("adminId");


--
-- Name: Admin Admin_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_email_key" UNIQUE (email);


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (id);


--
-- Name: Admin Admin_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_username_key" UNIQUE (username);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: Class Class_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_name_key" UNIQUE (name);


--
-- Name: Class Class_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_pkey" PRIMARY KEY (id);


--
-- Name: Fee Fee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Fee"
    ADD CONSTRAINT "Fee_pkey" PRIMARY KEY (id);


--
-- Name: Gallery Gallery_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Gallery"
    ADD CONSTRAINT "Gallery_pkey" PRIMARY KEY (id);


--
-- Name: Homework Homework_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Homework"
    ADD CONSTRAINT "Homework_pkey" PRIMARY KEY (id);


--
-- Name: Result Result_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Result"
    ADD CONSTRAINT "Result_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_email_key" UNIQUE (email);


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_studentId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_studentId_key" UNIQUE ("studentId");


--
-- Name: Submission Submission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_pkey" PRIMARY KEY (id);


--
-- Name: TeacherAttendance TeacherAttendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TeacherAttendance"
    ADD CONSTRAINT "TeacherAttendance_pkey" PRIMARY KEY (id);


--
-- Name: Teacher Teacher_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_email_key" UNIQUE (email);


--
-- Name: Teacher Teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY (id);


--
-- Name: Teacher Teacher_teacherId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_teacherId_key" UNIQUE ("teacherId");


--
-- Name: _ClassToTeacher_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_ClassToTeacher_AB_unique" ON public."_ClassToTeacher" USING btree ("A", "B");


--
-- Name: _ClassToTeacher_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_ClassToTeacher_B_index" ON public."_ClassToTeacher" USING btree ("B");


--
-- Name: Attendance Attendance_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Fee Fee_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Fee"
    ADD CONSTRAINT "Fee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Homework Homework_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Homework"
    ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Homework Homework_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Homework"
    ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Result Result_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Result"
    ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Student Student_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Submission Submission_homeworkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES public."Homework"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Submission Submission_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherAttendance TeacherAttendance_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TeacherAttendance"
    ADD CONSTRAINT "TeacherAttendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ClassToTeacher _ClassToTeacher_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_ClassToTeacher"
    ADD CONSTRAINT "_ClassToTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ClassToTeacher _ClassToTeacher_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_ClassToTeacher"
    ADD CONSTRAINT "_ClassToTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cEJvi6uwDBS2COimy1NFx5jIjuPz6nFbUUIpmUe5cr3KoBExqwkwuzLlEx71AkK

