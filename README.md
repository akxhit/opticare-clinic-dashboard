# OptiCare Clinic Dashboard

A specialized patient management and clinical documentation system designed for ophthalmologists and optometrists. This application streamlines clinic operations by centralizing patient records, eye examination data, and appointment scheduling into a secure, cloud-based platform.

## 🚀 Live Demo
**URL**: [https://opticare-clinic-dashboard.vercel.app](https://opticare-clinic-dashboard.vercel.app)

## ✨ Features
*   **Secure Authentication:** Email/Password and Google OAuth via Supabase.
*   **Patient Management:** Comprehensive patient profiles, search, and archiving.
*   **Clinical Eye Exams:** Detailed forms for OD/OS measurements, Refraction (Sph, Cyl, Axis), and IOP.
*   **Appointment Scheduling:** Visual calendar for tracking and booking patient visits.
*   **Data Export:** One-click CSV export of patient records with secure data sanitization.
*   **Responsive Design:** Optimized for both desktop and mobile clinic use.

## 🛠️ Tech Stack
*   **Frontend:** React 18, Vite, TypeScript
*   **Styling:** Tailwind CSS, Radix UI (Shadcn/UI)
*   **Backend:** Supabase (PostgreSQL, Auth, Storage)
*   **State Management:** TanStack Query (React Query)
*   **Hosting:** Vercel

## 💻 Local Development

Follow these steps to run the project locally:

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/akxhit/opticare-clinic-dashboard.git
    cd eye-clinic-dashboard
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
    ```

4.  **Start the development server:**
    ```sh
    npm run dev
    ```

## 🌐 Deployment

The project is configured for automatic deployment via Vercel. 

1.  Push changes to the `main` branch.
2.  Vercel will automatically trigger a build and deploy.
3.  **Note:** Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured in your Vercel Project Settings -> Environment Variables.
4.  **Routing Fix:** This project includes a `vercel.json` file to handle SPA routing (rewriting all requests to `index.html`).

## 📄 License
This project is private and for internal clinic use.
