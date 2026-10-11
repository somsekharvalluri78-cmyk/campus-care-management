import { pool } from './pool.js';

export const DEPARTMENTS = [
  // Core Campus
  { code: 'ADMIN', name: 'Administration', category: 'Campus Services' },
  { code: 'LIB', name: 'Library', category: 'Campus Services' },
  { code: 'HOSTEL', name: 'Hostel', category: 'Campus Services' },

  // 1. Engineering & Technology (UG / PG)
  { code: 'GEN-ENG', name: 'General Engineering (B.Tech)', category: 'Engineering & Technology' },
  { code: 'CSE', name: 'Computer Science & Engineering (CSE)', category: 'Engineering & Technology' },
  { code: 'IT', name: 'Information Technology (IT)', category: 'Engineering & Technology' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science (AI&DS)', category: 'Engineering & Technology' },
  { code: 'AIML', name: 'Artificial Intelligence & Machine Learning (AIML)', category: 'Engineering & Technology' },
  { code: 'CYBER-ENG', name: 'Cyber Security (Engineering)', category: 'Engineering & Technology' },
  { code: 'SWE-ENG', name: 'Software Engineering (B.Tech)', category: 'Engineering & Technology' },
  { code: 'ROBO', name: 'Robotics & Automation', category: 'Engineering & Technology' },
  { code: 'ECE', name: 'Electronics & Communication Engineering (ECE)', category: 'Engineering & Technology' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering (EEE)', category: 'Engineering & Technology' },
  { code: 'ME', name: 'Mechanical Engineering (ME)', category: 'Engineering & Technology' },
  { code: 'CE', name: 'Civil Engineering (CE)', category: 'Engineering & Technology' },
  { code: 'CHE', name: 'Chemical Engineering (ChE)', category: 'Engineering & Technology' },
  { code: 'MME', name: 'Metallurgical & Materials Engineering (MME)', category: 'Engineering & Technology' },
  { code: 'PE', name: 'Production Engineering (PE)', category: 'Engineering & Technology' },
  { code: 'AE', name: 'Automobile Engineering (AE)', category: 'Engineering & Technology' },
  { code: 'AERO', name: 'Aerospace Engineering (Aero)', category: 'Engineering & Technology' },
  { code: 'BME', name: 'Biomedical Engineering (BME)', category: 'Engineering & Technology' },
  { code: 'AGRI-ENG', name: 'Agricultural Engineering (Agri Engg)', category: 'Engineering & Technology' },
  { code: 'FT', name: 'Food Technology (FT)', category: 'Engineering & Technology' },

  // 2. Computer & IT (UG / PG)
  { code: 'BSC-CS', name: 'B.Sc. Computer Science', category: 'Computer & IT' },
  { code: 'BSC-IT', name: 'B.Sc. Information Technology', category: 'Computer & IT' },
  { code: 'BCA', name: 'BCA (Bachelor of Computer Applications)', category: 'Computer & IT' },
  { code: 'MCA', name: 'MCA (Master of Computer Applications)', category: 'Computer & IT' },
  { code: 'MSC-CS', name: 'M.Sc. Computer Science', category: 'Computer & IT' },
  { code: 'MSC-IT', name: 'M.Sc. Information Technology', category: 'Computer & IT' },
  { code: 'BTECH-CSE', name: 'B.Tech CSE (various specializations)', category: 'Computer & IT' },
  { code: 'MTECH-CS', name: 'M.Tech Computer Science', category: 'Computer & IT' },
  { code: 'MTECH-IT', name: 'M.Tech IT', category: 'Computer & IT' },
  { code: 'DS', name: 'Data Science (UG / PG)', category: 'Computer & IT' },
  { code: 'AI', name: 'Artificial Intelligence (UG / PG)', category: 'Computer & IT' },
  { code: 'ML', name: 'Machine Learning (UG / PG)', category: 'Computer & IT' },
  { code: 'CLOUD', name: 'Cloud Computing (UG / PG)', category: 'Computer & IT' },
  { code: 'CYBER-IT', name: 'Cyber Security (UG / PG)', category: 'Computer & IT' },
  { code: 'SE-IT', name: 'Software Engineering (UG / PG)', category: 'Computer & IT' },

  // 3. Electronics & Communication (UG / PG)
  { code: 'VLSI', name: 'VLSI Design', category: 'Electronics & Communication' },
  { code: 'EMBED', name: 'Embedded Systems', category: 'Electronics & Communication' },
  { code: 'COMM-SYS', name: 'Communication Systems', category: 'Electronics & Communication' },
  { code: 'RF-MW', name: 'RF & Microwave', category: 'Electronics & Communication' },
  { code: 'DIG-ELEC', name: 'Digital Electronics', category: 'Electronics & Communication' },
  { code: 'IOT', name: 'Sensors & IoT', category: 'Electronics & Communication' },
  { code: 'MTECH-ECE', name: 'M.Tech ECE', category: 'Electronics & Communication' },
  { code: 'MTECH-VLSI', name: 'M.Tech VLSI', category: 'Electronics & Communication' },
  { code: 'MTECH-ES', name: 'M.Tech Embedded Systems', category: 'Electronics & Communication' },

  // 4. Electrical & Energy (UG / PG)
  { code: 'PWR-SYS', name: 'Power Systems', category: 'Electrical & Energy' },
  { code: 'PWR-ELEC', name: 'Power Electronics', category: 'Electrical & Energy' },
  { code: 'REN-ENG', name: 'Renewable Energy', category: 'Electrical & Energy' },
  { code: 'ELEC-MACH', name: 'Electrical Machines', category: 'Electrical & Energy' },
  { code: 'HVE', name: 'High Voltage Engineering', category: 'Electrical & Energy' },
  { code: 'MTECH-PS', name: 'M.Tech Power Systems', category: 'Electrical & Energy' },
  { code: 'MTECH-PE', name: 'M.Tech Power Electronics', category: 'Electrical & Energy' },
  { code: 'MTECH-RE', name: 'M.Tech Renewable Energy', category: 'Electrical & Energy' },

  // 5. Mechanical & Related (UG / PG)
  { code: 'THERM-ENG', name: 'Thermal Engineering', category: 'Mechanical & Related' },
  { code: 'DES-ENG', name: 'Design Engineering', category: 'Mechanical & Related' },
  { code: 'MFG-ENG', name: 'Manufacturing Engineering', category: 'Mechanical & Related' },
  { code: 'IND-ENG', name: 'Industrial Engineering', category: 'Mechanical & Related' },
  { code: 'ROBO-MECH', name: 'Robotics & Automation (Mechanical)', category: 'Mechanical & Related' },
  { code: 'MTECH-ME', name: 'M.Tech Mechanical', category: 'Mechanical & Related' },
  { code: 'MTECH-TH', name: 'M.Tech Thermal', category: 'Mechanical & Related' },
  { code: 'MTECH-MFG', name: 'M.Tech Manufacturing', category: 'Mechanical & Related' },
  { code: 'MTECH-IE', name: 'M.Tech Industrial Engineering', category: 'Mechanical & Related' },

  // 6. Civil & Architecture (UG / PG)
  { code: 'STRUCT-ENG', name: 'Structural Engineering', category: 'Civil & Architecture' },
  { code: 'GEO-ENG', name: 'Geotechnical Engineering', category: 'Civil & Architecture' },
  { code: 'TRANS-ENG', name: 'Transportation Engineering', category: 'Civil & Architecture' },
  { code: 'ENV-ENG', name: 'Environmental Engineering', category: 'Civil & Architecture' },
  { code: 'CONST-MGT', name: 'Construction Management', category: 'Civil & Architecture' },
  { code: 'SURV-GEOM', name: 'Surveying & Geomatics', category: 'Civil & Architecture' },
  { code: 'MTECH-CE', name: 'M.Tech Civil', category: 'Civil & Architecture' },
  { code: 'MTECH-SE', name: 'M.Tech Structural', category: 'Civil & Architecture' },
  { code: 'MARCH', name: 'M.Arch (Architecture)', category: 'Civil & Architecture' },
  { code: 'URBAN-PLAN', name: 'Urban & Regional Planning', category: 'Civil & Architecture' },

  // 7. Science (UG / PG)
  { code: 'BSC-PHY', name: 'B.Sc. Physics', category: 'Science' },
  { code: 'BSC-CHEM', name: 'B.Sc. Chemistry', category: 'Science' },
  { code: 'BSC-MATH', name: 'B.Sc. Mathematics', category: 'Science' },
  { code: 'BSC-BIO', name: 'B.Sc. Biology / Life Sciences', category: 'Science' },
  { code: 'BSC-MICRO', name: 'B.Sc. Microbiology', category: 'Science' },
  { code: 'BSC-BIOTECH', name: 'B.Sc. Biotechnology', category: 'Science' },
  { code: 'BSC-STAT', name: 'B.Sc. Statistics', category: 'Science' },
  { code: 'BSC-ENV', name: 'B.Sc. Environmental Science', category: 'Science' },
  { code: 'MSC-PHY', name: 'M.Sc. Physics', category: 'Science' },
  { code: 'MSC-CHEM', name: 'M.Sc. Chemistry', category: 'Science' },
  { code: 'MSC-MATH', name: 'M.Sc. Mathematics', category: 'Science' },
  { code: 'MSC-BIOTECH', name: 'M.Sc. Biotechnology', category: 'Science' },
  { code: 'MSC-MICRO', name: 'M.Sc. Microbiology', category: 'Science' },
  { code: 'MSC-STAT', name: 'M.Sc. Statistics', category: 'Science' },
  { code: 'MSC-LIFE', name: 'M.Sc. Life Sciences', category: 'Science' },

  // 8. Management (UG / PG)
  { code: 'BBA', name: 'BBA (Bachelor of Business Administration)', category: 'Management' },
  { code: 'MBA', name: 'MBA (Master of Business Administration)', category: 'Management' },
  { code: 'BCOM-GEN', name: 'B.Com (General)', category: 'Management' },
  { code: 'BCOM-CA', name: 'B.Com (Computer Applications)', category: 'Management' },
  { code: 'BCOM-HONS', name: 'B.Com (Honours)', category: 'Management' },
  { code: 'MCOM', name: 'M.Com (Master of Commerce)', category: 'Management' },
  { code: 'MBA-SPEC', name: 'MBA (various specializations)', category: 'Management' },
  { code: 'PGDM', name: 'PGDM', category: 'Management' },
  { code: 'EMBA', name: 'Executive MBA', category: 'Management' },

  // 9. Commerce & Business (UG / PG)
  { code: 'BCOM-BI', name: 'B.Com (Banking & Insurance)', category: 'Commerce & Business' },
  { code: 'BBA-BA', name: 'BBA (Business Analytics)', category: 'Commerce & Business' },
  { code: 'BBA-LSC', name: 'BBA (Logistics & Supply Chain)', category: 'Commerce & Business' },
  { code: 'MCOM-FIN', name: 'M.Com (Finance)', category: 'Commerce & Business' },
  { code: 'MCOM-BA', name: 'M.Com (Business Analytics)', category: 'Commerce & Business' },

  // 10. Arts & Humanities (UG / PG)
  { code: 'BA-GEN', name: 'BA (General)', category: 'Arts & Humanities' },
  { code: 'BA-ENG', name: 'BA (English)', category: 'Arts & Humanities' },
  { code: 'BA-HIST', name: 'BA (History)', category: 'Arts & Humanities' },
  { code: 'BA-POL', name: 'BA (Political Science)', category: 'Arts & Humanities' },
  { code: 'BA-ECON', name: 'BA (Economics)', category: 'Arts & Humanities' },
  { code: 'BA-SOC', name: 'BA (Sociology)', category: 'Arts & Humanities' },
  { code: 'BA-PSY', name: 'BA (Psychology)', category: 'Arts & Humanities' },
  { code: 'BA-PUB', name: 'BA (Public Administration)', category: 'Arts & Humanities' },
  { code: 'BA-JMC', name: 'BA (Journalism & Mass Communication)', category: 'Arts & Humanities' },
  { code: 'MA-ENG', name: 'MA (English)', category: 'Arts & Humanities' },
  { code: 'MA-HIST', name: 'MA (History)', category: 'Arts & Humanities' },
  { code: 'MA-POL', name: 'MA (Political Science)', category: 'Arts & Humanities' },
  { code: 'MA-SOC', name: 'MA (Sociology)', category: 'Arts & Humanities' },
  { code: 'MA-ECON', name: 'MA (Economics)', category: 'Arts & Humanities' },
  { code: 'MA-PSY', name: 'MA (Psychology)', category: 'Arts & Humanities' },

  // 11. Law (UG / PG)
  { code: 'BALLB', name: 'BA LLB (5 Years)', category: 'Law' },
  { code: 'LLB', name: 'LLB (3 Years)', category: 'Law' },
  { code: 'LLM', name: 'LLM (Master of Laws)', category: 'Law' },
  { code: 'BBALLB', name: 'BBA LLB', category: 'Law' },
  { code: 'BCOMLLB', name: 'B.Com LLB', category: 'Law' },
  { code: 'INT-LAW', name: 'Integrated Law (5 Years)', category: 'Law' },

  // 12. Pharmacy (UG / PG)
  { code: 'DPHARM', name: 'D.Pharm', category: 'Pharmacy' },
  { code: 'BPHARM', name: 'B.Pharm', category: 'Pharmacy' },
  { code: 'MPHARM-PC', name: 'M.Pharm (Pharmaceutics)', category: 'Pharmacy' },
  { code: 'MPHARM-PL', name: 'M.Pharm (Pharmacology)', category: 'Pharmacy' },
  { code: 'MPHARM-CH', name: 'M.Pharm (Pharmaceutical Chemistry)', category: 'Pharmacy' },
  { code: 'MPHARM-PP', name: 'M.Pharm (Pharmacy Practice)', category: 'Pharmacy' },
  { code: 'PHARMD', name: 'Pharm.D', category: 'Pharmacy' },

  // 13. Agriculture (UG / PG)
  { code: 'BSC-AGRI', name: 'B.Sc. Agriculture', category: 'Agriculture' },
  { code: 'BSC-HORT', name: 'B.Sc. Horticulture', category: 'Agriculture' },
  { code: 'BSC-FOR', name: 'B.Sc. Forestry', category: 'Agriculture' },
  { code: 'BSC-FISH', name: 'B.Sc. Fisheries', category: 'Agriculture' },
  { code: 'BSC-SERI', name: 'B.Sc. Sericulture', category: 'Agriculture' },
  { code: 'MSC-AGRI', name: 'M.Sc. Agriculture', category: 'Agriculture' },
  { code: 'MSC-HORT', name: 'M.Sc. Horticulture', category: 'Agriculture' },
  { code: 'MSC-FOR', name: 'M.Sc. Forestry', category: 'Agriculture' },
  { code: 'MSC-FISH', name: 'M.Sc. Fisheries', category: 'Agriculture' },
  { code: 'MSC-SOIL', name: 'M.Sc. Soil Science', category: 'Agriculture' },

  // 14. Health & Allied (UG / PG)
  { code: 'BSC-NURS', name: 'B.Sc. Nursing', category: 'Health & Allied' },
  { code: 'GNM', name: 'GNM (General Nursing & Midwifery)', category: 'Health & Allied' },
  { code: 'BPT', name: 'BPT (Physiotherapy)', category: 'Health & Allied' },
  { code: 'BSC-MLT', name: 'B.Sc. Medical Laboratory Technology', category: 'Health & Allied' },
  { code: 'BSC-RAD', name: 'B.Sc. Radiology & Imaging', category: 'Health & Allied' },
  { code: 'BSC-OTT', name: 'B.Sc. Operation Theatre Technology', category: 'Health & Allied' },
  { code: 'BSC-OPTO', name: 'B.Sc. Optometry', category: 'Health & Allied' },
  { code: 'MSC-NURS', name: 'M.Sc. Nursing', category: 'Health & Allied' },
  { code: 'MPT', name: 'MPT (Master of Physiotherapy)', category: 'Health & Allied' },
  { code: 'MSC-MLT', name: 'M.Sc. Medical Lab Technology', category: 'Health & Allied' },

  // 15. Education (UG / PG)
  { code: 'BED', name: 'B.Ed (Bachelor of Education)', category: 'Education' },
  { code: 'MED', name: 'M.Ed (Master of Education)', category: 'Education' },
  { code: 'DELED', name: 'D.El.Ed (Diploma in Elementary Education)', category: 'Education' },
  { code: 'BELED', name: 'B.El.Ed (Bachelor of Elementary Education)', category: 'Education' },
  { code: 'MPHIL-ED', name: 'M.Phil (Education)', category: 'Education' },
  { code: 'PHD-ED', name: 'Ph.D. (Education)', category: 'Education' },

  // 16. Miscellaneous / Other (UG / PG)
  { code: 'BA-JOURN', name: 'B.A. Journalism', category: 'Miscellaneous / Other' },
  { code: 'BSC-ANIM', name: 'B.Sc. Animation', category: 'Miscellaneous / Other' },
  { code: 'BSC-FASH', name: 'B.Sc. Fashion Design', category: 'Miscellaneous / Other' },
  { code: 'BSC-INT', name: 'B.Sc. Interior Design', category: 'Miscellaneous / Other' },
  { code: 'BSC-FA', name: 'B.Sc. Fine Arts', category: 'Miscellaneous / Other' },
  { code: 'DIP-MUS', name: 'Diploma in Music', category: 'Miscellaneous / Other' },
  { code: 'DIP-DANCE', name: 'Diploma in Dance', category: 'Miscellaneous / Other' },
  { code: 'DIP-THTR', name: 'Diploma in Theatre Arts', category: 'Miscellaneous / Other' },
  { code: 'HOTEL-MGT', name: 'Hotel Management', category: 'Miscellaneous / Other' },
  { code: 'TOUR-HOSP', name: 'Tourism & Hospitality', category: 'Miscellaneous / Other' },
  { code: 'EVENT-MGT', name: 'Event Management', category: 'Miscellaneous / Other' },
  { code: 'SPORTS-MGT', name: 'Sports Management', category: 'Miscellaneous / Other' },
];

async function seedDepartments() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const d of DEPARTMENTS) {
      await client.query(
        `INSERT INTO departments (code, name, category, status)
         VALUES ($1, $2, $3, 'Active')
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, category = EXCLUDED.category, status = 'Active'`,
        [d.code, d.name, d.category],
      );
    }
    await client.query('COMMIT');
    console.log(`Successfully seeded ${DEPARTMENTS.length} college departments!`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding departments failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDepartments();
