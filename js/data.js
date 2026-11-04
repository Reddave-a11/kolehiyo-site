/* ==========================================================
   Kolehiyo ng Heneral Santos — site content
   These are the ORIGINAL (default) texts. Anything saved in the
   Admin Portal overrides them, so staff can edit the website
   without touching code. (KHS_DEFAULTS = factory settings.)
   ========================================================== */
window.KHS_DEFAULTS = {
  // Photos. Staff can replace these in Admin Portal → Photos.
  // If a file does not exist, the site simply shows a navy background instead.
  images: {
    heroBg: "images/campus.jpg",
    campusMain: "images/campus-main.jpg",
  },

  about: {
    mission:
      "To deliver accessible, tuition-free higher education that answers the real needs of General Santos City's industries and communities.",
    vision:
      "A city college recognized across Mindanao for competent graduates, honest service, and research rooted in local life.",
    mandate:
      "Established in 2025 by the City Government of General Santos as its own institution of higher learning.",
  },

  contact: {
    address: "Purok Maliwanag, Barangay Calumpang, General Santos City, Philippines 9500",
    email: "kolehiyodeheneral@gmail.com",
    facebook: "https://www.facebook.com/kolehiyoNgHeneralSantos",
    hours: "Monday to Friday, 8:00 AM – 5:00 PM\nSaturday, 8:00 AM – 12:00 NN (exam days only)",
    offices: [
      { name: "Office of Admissions", email: "kolehiyodeheneral@gmail.com", phone: "+63 (083) 552 4000" },
      { name: "Office of the Registrar", email: "kolehiyodeheneral@gmail.com", phone: "+63 (083) 552 4001" },
      { name: "Student Affairs", email: "kolehiyodeheneral@gmail.com", phone: "+63 (083) 552 4002" },
    ],
  },

  news: [
    {
      date: "September 15, 2026",
      tag: "Campus",
      title: "Official campus groundbreaking ceremony for the Centennial Building",
      body: "City officials and the college community gathered at the Calumpang campus site for the ceremonial torch-lighting and groundbreaking of the first permanent academic building.",
    },
    {
      date: "September 10, 2026",
      tag: "Scholarships",
      title: "Now accepting scholarship applications for Academic Year 2026–2027",
      body: "City-funded scholarship slots are open to incoming and continuing students. Applications are received at the Office of Student Affairs.",
    },
    {
      date: "August 28, 2026",
      tag: "Admissions",
      title: "Entrance examination schedules released for first-year applicants",
      body: "Examinations run every Saturday at 8:00 AM. Applicants must present an exam permit and a valid identification card.",
    },
    {
      date: "August 12, 2026",
      tag: "Partnership",
      title: "College signs agreement with local farms and agri-enterprises",
      body: "The partnership provides on-the-job training slots and equipment support for the BS Agribusiness program.",
    },
  ],

  courses: [
    {
      slug: "bs-agribusiness",
      name: "BS Agribusiness",
      short: "Crop production, agri-marketing, farm enterprise management",
      college: "College of Agriculture",
      duration: "4 years",
      image: "images/courses/bs-agribusiness.jpg",
      overview:
        "BS Agribusiness trains students in the science and business of agriculture — from crop and livestock production to marketing and farm enterprise management — rooted in the agricultural heartland of SOCCSKSARGEN.",
      highlights: [
        "Field work in farms and agri-enterprises in the region",
        "Hands-on crop, livestock and aquaculture practicum",
        "Focus on sustainable farming and agri-entrepreneurship",
      ],
      subjects: [
        "Principles of Crop Production",
        "Agricultural Economics",
        "Soil Science",
        "Agri-Marketing & Value Chains",
        "Agribusiness Entrepreneurship",
      ],
      careers: [
        "Agribusiness manager",
        "Farm supervisor",
        "Agricultural extension officer",
        "Agri-entrepreneur",
      ],
    },
    {
      slug: "bped",
      name: "Bachelor of Physical Education",
      short: "Sports, fitness and movement education",
      college: "College of Education",
      duration: "4 years",
      image: "images/courses/bped.jpg",
      overview:
        "BPEd develops teachers, coaches and fitness professionals who promote health, sportsmanship and physical literacy — combining exercise science, sports skills and teaching practice.",
      highlights: [
        "Practice teaching in schools and community sports programs",
        "Coaching, officiating and first-aid training",
        "Licensure Examination for Teachers (LET) review",
      ],
      subjects: [
        "Movement Education",
        "Human Anatomy & Physiology",
        "Individual & Team Sports",
        "Sports Psychology",
        "Physical Education Curriculum",
      ],
      careers: ["PE teacher", "Sports coach", "Fitness trainer", "Sports program coordinator"],
    },
    {
      slug: "beced",
      name: "Bachelor of Early Childhood Education",
      short: "Teaching and caring for young learners (ages 0–8)",
      college: "College of Education",
      duration: "4 years",
      image: "images/courses/beced.jpg",
      overview:
        "BECEd prepares teachers of preschool and early-grade children, focusing on child development, play-based learning and the foundations of literacy and numeracy in the crucial early years.",
      highlights: [
        "Practice teaching in preschools and kindergarten classes",
        "Training in play-based and child-centered methods",
        "Licensure Examination for Teachers (LET) review",
      ],
      subjects: [
        "Child Growth & Development",
        "Early Literacy & Numeracy",
        "Play-Based Learning",
        "Curriculum for Young Learners",
        "Health, Safety & Nutrition",
      ],
      careers: [
        "Preschool / kindergarten teacher",
        "Daycare administrator",
        "Early childhood program coordinator",
        "Learning facilitator",
      ],
    },
  ],

  steps: [
    ["01", "Secure an application form", "Fill out the online application form on this page, or get a printed copy at the Office of Admissions, Calumpang campus."],
    ["02", "Submit your requirements", "Complete documents are screened on the spot before an exam permit is issued."],
    ["03", "Take the entrance examination", "Scheduled in batches; bring your permit and a valid ID."],
    ["04", "Interview and evaluation", "Program chairs interview qualified examinees."],
    ["05", "Enroll", "Present your notice of admission to the Registrar to finalize your slot."],
  ],

  requirements: [
    "Form 138 (Senior High School report card), original and photocopy",
    "Certificate of Good Moral Character",
    "PSA birth certificate",
    "Barangay certificate of residency in General Santos City",
    "Two 2x2 ID photos with white background",
  ],

  keyDates: [
    ["Application period", "Open until May 15, 2026"],
    ["Entrance examinations", "Every Saturday, 8:00 AM"],
    ["Enrollment", "June 1 – 20, 2026"],
    ["Classes begin", "August 3, 2026"],
  ],

  values: [
    ["Katapatan", "Honesty in every transaction, inside and outside the classroom."],
    ["Kahusayan", "Excellence measured by what our graduates can actually do."],
    ["Malasakit", "Genuine care for students, families and the wider community."],
    ["Kaunlaran", "Progress for General Santos City through applied knowledge."],
  ],
};

// Working copy used by the pages. main.js replaces it with defaults + admin edits.
window.KHS = JSON.parse(JSON.stringify(window.KHS_DEFAULTS));
