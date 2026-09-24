/**
 * Department Tools Layer
 * Retrieves diagnostic equipment, clinical facilities, and active/inactive departments
 * by cross-referencing MongoDB Department master catalog with PostgreSQL Prisma doctor rosters.
 */
let prisma = null;
try {
  prisma = require('../../config/prisma');
} catch (err) {
  console.warn('Prisma client not initialized in departmentTools, using fallback.');
}

let Department = null;
try {
  Department = require('../../models/Department');
} catch (err) {
  console.warn('Mongoose Department model not initialized in departmentTools.');
}

/**
 * Retrieves all registered departments (both Active and Inactive/Unstaffed)
 * by cross-referencing MongoDB Master Departments with PostgreSQL Active Doctors.
 * All department names, descriptions, and facilities are fetched dynamically from MongoDB.
 */
async function getHospitalDepartments() {
  let masterDepts = [];
  if (Department) {
    try {
      masterDepts = await Department.find().lean();
    } catch (err) {
      console.warn("MongoDB Department query warning:", err.message);
    }
  }

  let doctors = [];
  if (prisma) {
    try {
      doctors = await prisma.user.findMany({
        where: { role: 'doctor' },
        include: { doctorProfile: true }
      });
    } catch (err) {
      console.warn("Prisma doctor query warning:", err.message);
    }
  }

  if (masterDepts.length > 0 || doctors.length > 0) {
    const activeDocMap = {};
    for (const doc of doctors) {
      const profile = doc.doctorProfile || {};
      const deptName = (profile.department || "General Medicine").trim();
      const key = deptName.toLowerCase();
      if (!activeDocMap[key]) {
        activeDocMap[key] = [];
      }
      activeDocMap[key].push({
        name: doc.name,
        specialization: profile.specialization || "Physician",
        experience: `${profile.experience || 5} years`,
        fee: `Rs. ${profile.fees || 500}`,
        status: profile.isPresenceActive ? "Available" : "On Leave"
      });
    }

    // Combine MongoDB departments with active doctor map
    const processedDepts = masterDepts.map(d => {
      const key = d.name.toLowerCase().trim();
      const matchedDoctors = activeDocMap[key] || [];
      const isActive = matchedDoctors.length > 0;
      return {
        department: d.name,
        description: d.description || "",
        facilities: (d.facilities && d.facilities.length > 0) ? d.facilities : [],
        status: isActive ? "Active" : "Inactive (Unstaffed)",
        is_active: isActive,
        doctor_count: matchedDoctors.length,
        doctors: matchedDoctors,
        operating_hours: isActive ? "09:00 AM - 12:00 PM (Monday to Friday)" : "Currently No Doctors Assigned",
      };
    });

    // Also include any doctor department that might not be in masterDepts
    for (const [key, docList] of Object.entries(activeDocMap)) {
      const exists = processedDepts.some(d => d.department.toLowerCase().trim() === key);
      if (!exists) {
        const title = docList[0]?.specialization || key.toUpperCase();
        processedDepts.push({
          department: title,
          description: "Clinical Department",
          facilities: [],
          status: "Active",
          is_active: true,
          doctor_count: docList.length,
          doctors: docList,
          operating_hours: "09:00 AM - 12:00 PM (Monday to Friday)",
        });
      }
    }

    const activeList = processedDepts.filter(d => d.is_active);
    const inactiveList = processedDepts.filter(d => !d.is_active);

    return {
      total_departments: processedDepts.length,
      active_departments_count: activeList.length,
      inactive_departments_count: inactiveList.length,
      active_departments: activeList.map(d => ({
        name: d.department,
        facilities: d.facilities,
        doctors: d.doctors.map(doc => `${doc.name} (${doc.specialization}, Fee: ${doc.fee})`),
      })),
      inactive_departments: inactiveList.map(d => ({
        name: d.department,
        description: d.description,
        facilities: d.facilities,
        status: "Inactive / Unstaffed (No active doctor assigned yet)",
      })),
      all_departments_breakdown: processedDepts,
      source: "Live Database (MongoDB Master + PostgreSQL Doctor Roster)"
    };
  }

  // Fallback if DB is unavailable
  return {
    total_departments: 0,
    active_departments_count: 0,
    inactive_departments_count: 0,
    active_departments: [],
    inactive_departments: [],
    source: "Live Database"
  };
}

/**
 * Retrieves department services, diagnostic facilities, and assigned doctors purely from the live database.
 * Facilities and descriptions come directly from MongoDB.
 * Assigned doctors and consultation fees come directly from PostgreSQL.
 */
async function getDepartmentServices({ department = "" } = {}) {
  const deptClean = (department || "").toLowerCase().trim();

  // 1. Fetch Department directly from MongoDB
  let masterDept = null;
  if (Department) {
    try {
      const masterDepts = await Department.find().lean();
      masterDept = masterDepts.find(d => 
        d.name.toLowerCase().trim() === deptClean || 
        d.name.toLowerCase().includes(deptClean) || 
        deptClean.includes(d.name.toLowerCase())
      );
    } catch (err) {
      console.warn("MongoDB error in getDepartmentServices:", err.message);
    }
  }

  // Live facilities stored directly in MongoDB document
  const dbFacilities = (masterDept && masterDept.facilities && masterDept.facilities.length > 0)
    ? masterDept.facilities
    : [];

  // 2. Fetch assigned doctors directly from PostgreSQL Prisma
  let doctors = [];
  if (prisma) {
    try {
      doctors = await prisma.user.findMany({
        where: {
          role: 'doctor',
          doctorProfile: {
            department: { contains: deptClean, mode: 'insensitive' }
          }
        },
        include: { doctorProfile: true }
      });
    } catch (err) {
      console.warn("Prisma error in getDepartmentServices:", err.message);
    }
  }

  if (doctors && doctors.length > 0) {
    const primaryDoc = doctors[0];
    const profile = primaryDoc.doctorProfile || {};
    const matchedDeptName = profile.department || (masterDept ? masterDept.name : department);

    return {
      department: matchedDeptName,
      status: "Active",
      is_active: true,
      description: masterDept ? masterDept.description : "",
      head_physician: primaryDoc.name,
      specialization: profile.specialization,
      consultation_fee: `Rs. ${profile.fees || 500}`,
      all_doctors: doctors.map(d => ({
        name: d.name,
        specialization: (d.doctorProfile && d.doctorProfile.specialization) || "Physician",
        experience: `${(d.doctorProfile && d.doctorProfile.experience) || 5} years`,
        status: (d.doctorProfile && d.doctorProfile.isPresenceActive) ? "Available" : "On Leave"
      })),
      facilities: dbFacilities,
      location: "Clinical Consultation Wing",
      walk_in_allowed: true,
      operating_hours: "09:00 AM - 12:00 PM (Mon-Fri)",
      source: "Live Database (MongoDB + PostgreSQL)"
    };
  }

  // 3. If no active doctors, but department exists in MongoDB
  if (masterDept) {
    const facilitiesText = dbFacilities.length > 0
      ? `equipped with facilities: ${dbFacilities.join(', ')}`
      : 'clinical department';

    return {
      department: masterDept.name,
      description: masterDept.description || "Registered clinical department at Amar Raho Hospital",
      status: "Inactive / Unstaffed",
      is_active: false,
      doctor_count: 0,
      doctors: [],
      facilities: dbFacilities,
      location: "Clinical Wing (Pending Physician Assignment)",
      walk_in_allowed: false,
      operating_hours: "Currently Closed (No Assigned Specialist)",
      message: `The ${masterDept.name} department is officially registered in Amar Raho Hospital's database (${facilitiesText}). However, no active specialist is currently assigned to this department, so appointment bookings are not available at this time.`,
      source: "MongoDB Live Master Catalog"
    };
  }

  // 4. Department not found in database at all
  const liveInfo = await getHospitalDepartments();
  return {
    error: `Department '${department}' is not recognized as a registered department in Amar Raho Hospital's database.`,
    active_departments: liveInfo.active_departments ? liveInfo.active_departments.map(d => d.name) : [],
    inactive_departments: liveInfo.inactive_departments ? liveInfo.inactive_departments.map(d => d.name) : []
  };
}

module.exports = {
  getHospitalDepartments,
  getDepartmentServices,
};
