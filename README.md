# God Of Seed Academy — Comprehensive School Connect Platform

Welcome to the official, enterprise-grade School Connect management platform generated specifically for **God Of Seed Academy**. This deployment package provides everything needed to establish a digital footprint for your institution, complete with progressive web application capabilities, advanced role-based access, and enterprise-level modules.

## 🚀 Overview

This fully-featured platform adapts to traditional and modern build deployments. It comes built-in with features like offline access, push notifications, row-level security, and a beautiful UI tailored to your specific branding choices.

**School Motto:** Excellent in Character and Academics
**Branding Theme:** theme2 (Primary: #1c72e7, Accent: #5e2174)
**Typography:** Inter

---

## 🛠️ Deployment Instructions

### Step 1: Database and Authentication Setup (Supabase)
We use Supabase for free, secure, and scalable backend infrastructure.
1. **Create a Free Project**: Head to [Supabase](https://supabase.com) and create a free tier project.
2. **Execute Schema**: In your project's **SQL Editor**, paste and run the entire contents of `database/schema.sql`.
3. **Get Credentials**: Go to Project Settings → API and copy your **Project URL** and **anon public key**.
4. **Link Frontend**: Open `assets/js/config.js` and replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your copied values.

### Step 2: Hosting and Build Process
This platform supports the build type you selected during generation: **TRADITIONAL**.

**Traditional Build Workflow (Static Hosting):**
1. **Deployment Platform**: You can host this instantly on platforms like GitHub Pages, Vercel, Netlify, or Cloudflare Pages.
2. **Upload Files**: Simply drag and drop or push the entire directory contents to your chosen platform.
3. **No Build Step Required**: Since this is purely static (HTML/CSS/JS), it serves immediately without any build configuration.

### Step 3: Admin Initialization
1. Visit the deployed site in your browser.
2. Click **Sign in to Portal** and choose **Request access** to register an account.
3. Head back to the Supabase SQL Editor and elevate your newly created user to an admin by running:
   ```sql
   UPDATE profiles SET role='admin', status='approved' WHERE email='your-email@example.com';
   ```
4. You can now log in, access the dashboard, and begin approving staff and students directly from the **Directory** or **Staff** modules.

---

## 📦 Enabled Modules
Your platform is pre-configured with the following modules:
- **Students & Profiles**
- **Staff / Teachers**
- **Classes & Subjects**
- **Attendance**
- **Results / Report Cards**
- **Timetable**
- **Scheme of Work**
- **CBT / Online Exams**
- **Assignments / Homework**
- **Conduct / Behaviour**
- **Promotion / Graduation**
- **Integrated LMS**
- **PBIS & Gamification**
- **Fees & Payments**
- **School Finance**
- **Leave Management**
- **Announcements**
- **Messaging (WA/Email)**
- **In-App Inbox**
- **Complaints & Grievance**
- **Results Broadcast**
- **Voting & Polls**
- **PTA Meeting Scheduler**
- **Photo & Video Gallery**
- **E-Resources / Notes**
- **Birthdays**
- **Digital ID Cards**
- **Reports & Export**
- **Directory**
- **Departments & Offices**
- **Parent–Child Mapping**
- **School Calendar**
- **Lost & Found**
- **Admissions & Enrollment**
- **HR & Payroll**
- **Certificates & Documents**
- **Analytics Dashboard**

---

## 🌟 Enterprise Features

- **Progressive Web App (PWA)**: Installable directly on any mobile device or desktop. Fully capable of offline caching.
- **Advanced Push Notifications**: Integrated with Service Workers to deliver browser, email, and WhatsApp notifications to parents and staff instantly.
- **Voting & Polling System**: Secure, anonymous, and real-time electronic voting for school prefects or PTA decisions.
- **Row-Level Security (RLS)**: Enterprise-grade database security ensuring families can only access their specific records.
- **Search Engine Optimization (SEO)**: Pre-generated `robots.txt`, `sitemap.xml`, and JSON-LD schema ensure your school ranks highly on Google and points prospects to the HMG Academy Ecosystem for lead generation.
- **Dark Mode & Responsive UI**: Adaptive design that looks perfect on 4K monitors and mobile phones alike.

---

## 🌐 HMG Academy Ecosystem
This platform is a proud part of the **HMG Academy Ecosystem**. It's optimized for lead generation, pointing prospective clients and students to [HMG Concepts](https://hmgconcepts.pages.dev/). The software stays free forever, with robust architecture preventing any dependency on paid AI APIs or costly third-party services.
