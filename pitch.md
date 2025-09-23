# HackoSquad — Learn Cybersecurity by Doing (and Battling Red vs Blue in Real Time)

HackoSquad is a hands-on cybersecurity platform where you learn by building, breaking, defending — and competing. Whether you’re new to security or sharpening professional skills, you’ll practice in guided Skill Paths, earn practical Certifications, battle in real-time Red vs Blue matches, and even create your own challenges.

## What you can do

- Battle in Red vs Blue (real-time attack vs defend)
  - Head-to-head matches where Red attacks and Blue defends in real time.
  - Play solo or as a team; climb leaderboards with clear, fair scoring.
  - Train both mindsets in one place, then review performance to improve.

- Follow Skill Paths to real certifications
  - Start a path and see exactly what you’ll learn (objectives, difficulty, prerequisites).
  - Track progress inside the path page: modules completed, points earned, and a certificate preview.
  - Earn a practical certificate by passing the final exam (default pass mark 75%). Validity, attempts, and cooldowns are clearly shown.

- Practice in Labs and Challenges
  - Tackle realistic web, network, crypto, and system tasks with instant feedback and points.
  - Each completion automatically updates progress across every Skill Path that contains that item — your work counts everywhere.

- Battle in Red vs Blue (attack vs defend)
  - Train both sides of the fence: launch/red-team scenarios or defend/blue-team roles — live.
  - Join solo or with teammates and climb the leaderboard through fair, score-based matches.

- Create your own content (UGC)
  - Anyone can propose and build challenges/labs in the Creator area.
  - Share with the community or your team, collect feedback, and grow your reputation.

- Grow your profile and your rank
  - Earn points, badges, and higher ranks as you complete content.
  - Join teams, compete on leaderboards, and showcase your progress on a modern profile page.

## What makes HackoSquad different

- Real-time Red vs Blue at the core: Compete live in attack/defend matches — solo or team — with transparent scoring and ranking.
- Practical-first certifications: We measure what you can do. Exams are tied to real tasks, not just multiple choice.
- Universal progress: Finish a lab once; it updates every path that includes it. No duplicate grinding.
- Community creation: Challenges aren’t a black box — anyone can build and publish, so the catalog grows with you.
- Fast and lightweight: The app is optimized for speed with modern React/Vite and smart code-splitting.

## How it works

1) Sign up and pick a Skill Path that fits your goal (e.g., Security Analyst, Web App Security) — or jump straight into a Red vs Blue match.

2) Enroll to unlock modules. Complete challenges and labs; your progress bar fills as you go.

3) When ready, attempt the certification exam. Pass at ≥75% to earn your certificate (shown in the path and on your profile).

4) Jump into Red vs Blue matches (solo or team) to practice attack/defend live. Earn points and badges for your performance.

5) Want to give back? Open the Creator area to build your own challenge or lab and submit it for review.

## Under the hood (for technical buyers)

- Frontend: React + TypeScript + Vite, Tailwind CSS, and Framer Motion for a responsive, modern UI.
- Backend: Supabase (Auth + Postgres + RLS). Progress and completion logic is centralized:
  - Enrollment: ensureSkillPathEnrollment
  - Progress recompute: recomputeSkillPathProgress
  - Item completion: markSkillPathItemCompleted
  - Global propagation: markAllPathsContainingItemAsCompleted
- Performance: Route-level code splitting, CDN-friendly headers, and tuned DB indexes.
- Portability: The schema works cleanly on vanilla Postgres if you migrate off Supabase later.

## Who it’s for

- Beginners entering cybersecurity (SOC, Blue/Red Team, AppSec)
- Experienced practitioners keeping sharp with practical tasks
- Bootcamps, universities, and organizations training cohorts or teams

## What’s next

- Exam engine upgrades: timed sections, question banks, and anti-cheat basics.
- Payments (provider-agnostic): support global cards and UPI; unlock certifications and premium paths post-webhook.
- Deeper team features: org reporting, assignments, and SSO.

## Get started

- Explore free challenges and labs right away.
- Enroll in a Skill Path and watch your progress update as you learn.
- Attempt the final exam and earn a certificate you can show employers.

If you’d like a tailored demo for your team or a specific role track, we’ll preload a relevant Skill Path and share a sample certificate with your branding.
