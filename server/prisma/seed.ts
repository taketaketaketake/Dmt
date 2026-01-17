import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data...");

  // Clear in correct order due to foreign keys
  await prisma.projectFollow.deleteMany();
  await prisma.userFavorite.deleteMany();
  await prisma.job.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.projectCategory.deleteMany();
  await prisma.project.deleteMany();
  await prisma.profileCategory.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.magicLinkToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding database...");

  // Create 9 users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "maya.chen@example.com",
        status: "approved",
        isEmployer: true,
        isAdmin: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "marcus.johnson@example.com",
        status: "approved",
        isEmployer: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah.okonkwo@example.com",
        status: "approved",
      },
    }),
    prisma.user.create({
      data: {
        email: "james.riley@example.com",
        status: "approved",
      },
    }),
    prisma.user.create({
      data: {
        email: "elena.vasquez@example.com",
        status: "approved",
        isEmployer: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "david.kim@example.com",
        status: "approved",
      },
    }),
    prisma.user.create({
      data: {
        email: "aisha.patel@example.com",
        status: "approved",
      },
    }),
    prisma.user.create({
      data: {
        email: "chris.thompson@example.com",
        status: "approved",
      },
    }),
    prisma.user.create({
      data: {
        email: "nina.rodriguez@example.com",
        status: "approved",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create profiles for each user
  const profiles = await Promise.all([
    prisma.profile.create({
      data: {
        userId: users[0].id,
        name: "Maya Chen",
        handle: "mayachen",
        bio: "Full-stack engineer building tools for local manufacturing. Former Google, now focused on Detroit's industrial revival. Rust, TypeScript, embedded systems.",
        location: "Corktown",
        websiteUrl: "https://mayachen.dev",
        githubHandle: "mayachen",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[1].id,
        name: "Marcus Johnson",
        handle: "marcusj",
        bio: "AI/ML engineer specializing in computer vision for automotive applications. Building the future of autonomous systems in the Motor City.",
        location: "Midtown",
        linkedinUrl: "https://linkedin.com/in/marcusjohnson",
        githubHandle: "marcusj",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[2].id,
        name: "Sarah Okonkwo",
        handle: "sarahokonkwo",
        bio: "Hardware engineer and robotics enthusiast. Designing pick-and-place systems for small-batch manufacturing. MIT alumna.",
        location: "Eastern Market",
        websiteUrl: "https://sarahokonkwo.com",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[3].id,
        name: "James Riley",
        handle: "jamesriley",
        bio: "Backend systems architect. Distributed systems, Kubernetes, and infrastructure automation. Helping Detroit startups scale.",
        location: "Downtown",
        githubHandle: "jriley",
        linkedinUrl: "https://linkedin.com/in/jamesriley",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[4].id,
        name: "Elena Vasquez",
        handle: "elenavasquez",
        bio: "Founder of Forge Robotics. Building collaborative robots for small manufacturers. Previously Boston Dynamics.",
        location: "New Center",
        websiteUrl: "https://forgerobotics.io",
        twitterHandle: "elenavasquez",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[5].id,
        name: "David Kim",
        handle: "davidkim",
        bio: "Mobile developer focused on industrial IoT applications. React Native, Swift, Kotlin. Connecting factory floors to the cloud.",
        location: "Brush Park",
        githubHandle: "davidkim",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[6].id,
        name: "Aisha Patel",
        handle: "aishapatel",
        bio: "Data engineer building analytics pipelines for manufacturing optimization. Python, Spark, dbt. Making factories smarter.",
        location: "West Village",
        linkedinUrl: "https://linkedin.com/in/aishapatel",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[7].id,
        name: "Chris Thompson",
        handle: "christhompson",
        bio: "Embedded systems developer. ARM, RISC-V, and real-time operating systems. Building the brains of Detroit's next-gen machines.",
        location: "Woodbridge",
        githubHandle: "cthompson",
        websiteUrl: "https://christhompson.dev",
        approvalStatus: "approved",
      },
    }),
    prisma.profile.create({
      data: {
        userId: users[8].id,
        name: "Nina Rodriguez",
        handle: "ninarodriguez",
        bio: "Frontend architect and design systems specialist. Making complex industrial software actually usable. Figma, React, accessibility advocate.",
        location: "Rivertown",
        twitterHandle: "ninarodriguez",
        websiteUrl: "https://ninarodriguez.design",
        approvalStatus: "approved",
      },
    }),
  ]);

  console.log(`Created ${profiles.length} profiles`);

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        creatorId: profiles[0].id,
        title: "FactoryOS",
        description: "Open-source operating system for CNC machines. Modernizing legacy equipment with real-time monitoring, predictive maintenance, and remote operation capabilities.",
        repoUrl: "https://github.com/mayachen/factoryos",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[0].id,
        title: "Detroit Parts Exchange",
        description: "Marketplace connecting local manufacturers with surplus inventory. Reducing waste and strengthening supply chain resilience.",
        websiteUrl: "https://detroitparts.exchange",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[1].id,
        title: "AutoVision SDK",
        description: "Computer vision toolkit for automotive quality inspection. Detects defects in real-time on the assembly line with 99.7% accuracy.",
        websiteUrl: "https://autovision.dev",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[2].id,
        title: "MicroPick",
        description: "Affordable pick-and-place robot for electronics assembly. Designed for small batch production runs typical of Detroit's job shops.",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[3].id,
        title: "Kubernetes for Factories",
        description: "Reference architecture and Helm charts for deploying industrial IoT workloads. Battle-tested in 12 Detroit manufacturing facilities.",
        repoUrl: "https://github.com/jriley/k8s-factory",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[4].id,
        title: "Forge Cobot",
        description: "Collaborative robot designed for small manufacturers. Safe enough to work alongside humans, smart enough to learn new tasks in minutes.",
        websiteUrl: "https://forgerobotics.io/cobot",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[5].id,
        title: "ShopFloor Mobile",
        description: "Mobile app giving factory workers real-time access to machine status, work orders, and quality documentation.",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[6].id,
        title: "ManufactureMetrics",
        description: "Open-source analytics platform for OEE tracking. Unified dashboard for machine utilization across multiple facilities.",
        repoUrl: "https://github.com/aishapatel/manufacture-metrics",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[7].id,
        title: "RTOS-Detroit",
        description: "Real-time operating system optimized for industrial control. Sub-microsecond latency for precision manufacturing applications.",
        repoUrl: "https://github.com/cthompson/rtos-detroit",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[8].id,
        title: "Industrial Design System",
        description: "Component library and design tokens for manufacturing software. Making HMI development faster and more consistent.",
        websiteUrl: "https://industrialdesign.systems",
        status: "active",
      },
    }),
    prisma.project.create({
      data: {
        creatorId: profiles[8].id,
        title: "AccessibleHMI",
        description: "Guidelines and tools for building accessible human-machine interfaces. Because factory workers deserve good software too.",
        repoUrl: "https://github.com/ninarodriguez/accessible-hmi",
        status: "active",
      },
    }),
  ]);

  console.log(`Created ${projects.length} projects`);

  // Create jobs (from employers)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        posterId: profiles[0].id,
        title: "Senior Rust Engineer",
        companyName: "FactoryOS",
        description: "Build the next generation of industrial control software. You'll work on real-time systems, embedded Rust, and help modernize Detroit's manufacturing infrastructure. $150k - $180k. Detroit, MI (Hybrid).",
        type: "full_time",
        applyUrl: "https://factoryos.io/careers/rust-engineer",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[1].id,
        title: "Computer Vision Engineer",
        companyName: "AutoVision",
        description: "Develop ML models for automotive quality inspection. Experience with PyTorch, edge deployment, and real-time inference required. $140k - $170k. Detroit, MI.",
        type: "full_time",
        applyUrl: "https://autovision.dev/jobs/cv-engineer",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[1].id,
        title: "MLOps Engineer",
        companyName: "AutoVision",
        description: "Build and maintain ML infrastructure for continuous model training and deployment. Kubernetes, MLflow, and Python expertise needed. $130k - $160k. Remote (US).",
        type: "full_time",
        applyUrl: "https://autovision.dev/jobs/mlops",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[4].id,
        title: "Robotics Software Engineer",
        companyName: "Forge Robotics",
        description: "Design motion planning and control systems for collaborative robots. ROS2, C++, and robotics experience required. $145k - $175k. Detroit, MI.",
        type: "full_time",
        applyUrl: "https://forgerobotics.io/careers/robotics-engineer",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[4].id,
        title: "Mechanical Engineer",
        companyName: "Forge Robotics",
        description: "Design and prototype robotic manipulators. SolidWorks, FEA analysis, and hands-on fabrication experience preferred. $110k - $140k. Detroit, MI.",
        type: "full_time",
        applyUrl: "https://forgerobotics.io/careers/mechanical-engineer",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[0].id,
        title: "Full-Stack TypeScript Developer",
        companyName: "Detroit Parts Exchange",
        description: "Build marketplace features for our B2B manufacturing platform. React, Node.js, PostgreSQL. $120k - $150k. Remote (Detroit preferred).",
        type: "full_time",
        applyUrl: "https://detroitparts.exchange/careers",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[4].id,
        title: "Technical Writer",
        companyName: "Forge Robotics",
        description: "Create documentation, tutorials, and training materials for our cobot platform. Technical background and clear writing required. $80k - $100k. Detroit, MI (Hybrid).",
        type: "contract",
        applyUrl: "https://forgerobotics.io/careers/tech-writer",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[1].id,
        title: "Senior Frontend Engineer",
        companyName: "AutoVision",
        description: "Build intuitive interfaces for complex vision systems. React, TypeScript, WebGL experience a plus. $130k - $160k. Detroit, MI.",
        type: "full_time",
        applyUrl: "https://autovision.dev/jobs/frontend",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
    prisma.job.create({
      data: {
        posterId: profiles[0].id,
        title: "Embedded Systems Intern",
        companyName: "FactoryOS",
        description: "Summer internship working on industrial IoT devices. C/C++, basic electronics knowledge. Learn from experienced engineers. $30/hour. Detroit, MI.",
        type: "part_time",
        applyUrl: "https://factoryos.io/careers/intern",
        expiresAt: thirtyDaysFromNow,
        active: true,
      },
    }),
  ]);

  console.log(`Created ${jobs.length} jobs`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
