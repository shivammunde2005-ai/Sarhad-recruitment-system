// ====== FIREBASE CONFIG & SETUP ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove, get } 
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsv3y3QbhpbNpX8Ou57A1G1xSUlCXSIkc",
  authDomain: "sarhad-cell.firebaseapp.com",
  databaseURL: "https://sarhad-cell-default-rtdb.firebaseio.com",
  projectId: "sarhad-cell",
  storageBucket: "sarhad-cell.firebasestorage.app",
  messagingSenderId: "815393200961",
  appId: "1:815393200961:web:12332b935a789a4505dfc0",
  measurementId: "G-XSN0GP73FB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentRole = null;
let currentUserName = "";

// Initialize LocalStorage Data immediately
renderHomeData();

// ====== UI ROUTING & HELPERS ======
window.showSection = (sectionId) => {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.getElementById(sectionId).classList.remove('hidden');
    
    if(sectionId === 'home-section') renderHomeData();
    if(sectionId === 'jobs-section') fetchPublicJobs();
    if(sectionId === 'departments-section') fetchDepartments();
    if(sectionId === 'admin-dashboard') { fetchAdminJobs(); fetchAdminApplications(); renderAdminHomeLists(); }
    if(sectionId === 'applicant-dashboard') fetchMyApplications();
};

window.toggleAdminTabs = (tabId) => {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    if(tabId === 'manage-home') renderAdminHomeLists();
};

window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

// ====== AUTHENTICATION LOGIC ======
onAuthStateChanged(auth, async (user) => {
    const guestLinks = document.querySelectorAll('.guest-only');
    const authLinks = document.querySelectorAll('.auth-only');
    const adminLinks = document.querySelectorAll('.admin-only');
    const appLinks = document.querySelectorAll('.applicant-only');

    if (user) {
        currentUser = user;
        const snapshot = await get(dbRef(db, 'users/' + user.uid));
        if(snapshot.exists()) {
            currentRole = snapshot.val().role;
            currentUserName = snapshot.val().name;
        }

        guestLinks.forEach(el => el.classList.add('hidden'));
        authLinks.forEach(el => el.classList.remove('hidden'));

        if(currentRole === 'admin') {
            adminLinks.forEach(el => el.classList.remove('hidden'));
            appLinks.forEach(el => el.classList.add('hidden'));
            window.showSection('admin-dashboard');
        } else {
            appLinks.forEach(el => el.classList.remove('hidden'));
            adminLinks.forEach(el => el.classList.add('hidden'));
            window.showSection('applicant-dashboard');
        }
    } else {
        currentUser = null; currentRole = null;
        guestLinks.forEach(el => el.classList.remove('hidden'));
        authLinks.forEach(el => el.classList.add('hidden'));
        adminLinks.forEach(el => el.classList.add('hidden'));
        appLinks.forEach(el => el.classList.add('hidden'));
        window.showSection('home-section');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        let role = (email === "admin@sarhadcollege.com") ? "admin" : "applicant";
        await set(dbRef(db, 'users/' + userCred.user.uid), { uid: userCred.user.uid, name, email, role });
        alert("Registration Successful!");
        e.target.reset();
    } catch (error) { alert(error.message); }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
        e.target.reset();
    } catch (error) { alert(error.message); }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));


// ====== LOCAL STORAGE ENGINE (For Campus Photos & Info Cards) ======
function getLocalPhotos() { return JSON.parse(localStorage.getItem('campusPhotos')) ||[]; }
function getLocalCards() { return JSON.parse(localStorage.getItem('infoCards')) ||[]; }

document.getElementById('add-image-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const title = document.getElementById('img-title').value;
    const file = document.getElementById('img-file').files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const base64Img = event.target.result;
        const photos = getLocalPhotos();
        photos.push({ title: title, url: base64Img });
        localStorage.setItem('campusPhotos', JSON.stringify(photos));
        alert("Photo Added Successfully!");
        e.target.reset();
        renderAdminHomeLists();
        renderHomeData();
    };
    if (file) { reader.readAsDataURL(file); }
});

document.getElementById('add-info-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const cards = getLocalCards();
    cards.push({
        title: document.getElementById('info-title').value,
        desc: document.getElementById('info-desc').value
    });
    localStorage.setItem('infoCards', JSON.stringify(cards));
    alert("Card Added Successfully!");
    e.target.reset();
    renderAdminHomeLists();
    renderHomeData();
});

window.deleteLocalPhoto = (index) => {
    if(!confirm("Delete this photo?")) return;
    let photos = getLocalPhotos();
    photos.splice(index, 1);
    localStorage.setItem('campusPhotos', JSON.stringify(photos));
    renderAdminHomeLists(); renderHomeData();
};

window.deleteLocalCard = (index) => {
    if(!confirm("Delete this card?")) return;
    let cards = getLocalCards();
    cards.splice(index, 1);
    localStorage.setItem('infoCards', JSON.stringify(cards));
    renderAdminHomeLists(); renderHomeData();
};

window.renderAdminHomeLists = () => {
    const photoList = document.getElementById('admin-photo-list');
    const cardList = document.getElementById('admin-card-list');
    photoList.innerHTML = ''; cardList.innerHTML = '';

    getLocalPhotos().forEach((photo, index) => {
        photoList.innerHTML += `<li><span>${photo.title}</span> <button onclick="deleteLocalPhoto(${index})"><i class="fa-solid fa-trash"></i></button></li>`;
    });
    getLocalCards().forEach((card, index) => {
        cardList.innerHTML += `<li><span>${card.title}</span> <button onclick="deleteLocalCard(${index})"><i class="fa-solid fa-trash"></i></button></li>`;
    });
};

function renderHomeData() {
    const galleryGrid = document.getElementById('public-gallery-list');
    const infoGrid = document.getElementById('public-info-list');
    galleryGrid.innerHTML = ''; infoGrid.innerHTML = '';
    
    const photos = getLocalPhotos();
    if(photos.length === 0) {
        galleryGrid.innerHTML = `<div class="gallery-item"><img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f" alt="Default"><div class="gallery-caption">Main Campus</div></div>`;
    } else {
        photos.forEach(photo => {
            galleryGrid.innerHTML += `<div class="gallery-item"><img src="${photo.url}" alt="${photo.title}"><div class="gallery-caption">${photo.title}</div></div>`;
        });
    }

    const cards = getLocalCards();
    if(cards.length === 0) {
        infoGrid.innerHTML = `<div class="info-card"><h3>Our Vision</h3><p>Providing quality education and fostering innovation for a better tomorrow.</p></div>`;
    } else {
        cards.forEach(card => {
            infoGrid.innerHTML += `<div class="info-card"><h3>${card.title}</h3><p>${card.desc}</p></div>`;
        });
    }
}


// ====== ADMIN: MANAGE JOBS (Firebase Realtime DB) ======
document.getElementById('add-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await push(dbRef(db, 'jobs'), {
        title: document.getElementById('job-title').value,
        department: document.getElementById('job-department').value,
        qualification: document.getElementById('job-qualification').value,
        salary: document.getElementById('job-salary').value,
        description: document.getElementById('job-desc').value,
    });
    alert("Job Vacancy Added!");
    e.target.reset();
});

function fetchAdminJobs() {
    onValue(dbRef(db, 'jobs'), (snapshot) => {
        const tbody = document.getElementById('admin-jobs-list');
        tbody.innerHTML = '';
        snapshot.forEach(child => {
            const job = child.val();
            tbody.innerHTML += `
                <tr>
                    <td>${job.title}</td><td>${job.department}</td><td>${job.qualification}</td>
                    <td>
                        <button class="btn btn-nav warning" onclick="openEditJob('${child.key}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-nav danger" onclick="deleteJob('${child.key}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    });
}

window.deleteJob = (jobId) => { if(confirm("Delete this vacancy?")) remove(dbRef(db, 'jobs/' + jobId)); };

window.openEditJob = async (jobId) => {
    const snapshot = await get(dbRef(db, 'jobs/' + jobId));
    const job = snapshot.val();
    document.getElementById('edit-job-id').value = jobId;
    document.getElementById('edit-job-title').value = job.title;
    document.getElementById('edit-job-department').value = job.department;
    document.getElementById('edit-job-qualification').value = job.qualification;
    document.getElementById('edit-job-salary').value = job.salary;
    document.getElementById('edit-job-desc').value = job.description;
    document.getElementById('edit-job-modal').classList.remove('hidden');
};

document.getElementById('edit-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-job-id').value;
    await update(dbRef(db, 'jobs/' + id), {
        title: document.getElementById('edit-job-title').value,
        department: document.getElementById('edit-job-department').value,
        qualification: document.getElementById('edit-job-qualification').value,
        salary: document.getElementById('edit-job-salary').value,
        description: document.getElementById('edit-job-desc').value
    });
    alert("Job Updated!");
    closeModal('edit-job-modal');
});


// ====== PUBLIC JOBS & APPLY ======
function fetchPublicJobs() {
    onValue(dbRef(db, 'jobs'), (snapshot) => {
        const grid = document.getElementById('public-jobs-list');
        grid.innerHTML = '';
        snapshot.forEach(child => {
            const job = child.val();
            grid.innerHTML += `<div class="job-card"><div><h3>${job.title}</h3><p><strong>Dept:</strong> ${job.department}</p><p><strong>Required:</strong> ${job.qualification}</p><p><strong>Salary:</strong> ${job.salary}</p><p>${job.description}</p></div><button class="btn btn-secondary mt-2" onclick="openApplyModal('${child.key}', '${job.title}')">Apply Now</button></div>`;
        });
    });
}

function fetchDepartments() {
    onValue(dbRef(db, 'jobs'), (snapshot) => {
        const container = document.getElementById('department-jobs-list');
        container.innerHTML = '';
        const deptMap = {};
        snapshot.forEach(child => {
            const job = child.val();
            if(!deptMap[job.department]) deptMap[job.department] = [];
            deptMap[job.department].push({id: child.key, ...job});
        });
        for(let dept in deptMap) {
            let html = `<div class="dept-title">${dept} Department</div><div class="card-grid">`;
            deptMap[dept].forEach(job => { html += `<div class="job-card"><h3>${job.title}</h3><p><strong>Required:</strong> ${job.qualification}</p><button class="btn btn-secondary mt-2" onclick="openApplyModal('${job.id}', '${job.title}')">Apply</button></div>`; });
            container.innerHTML += html + `</div>`;
        }
    });
}

window.openApplyModal = (jobId, jobTitle) => {
    if(!currentUser || currentRole !== 'applicant') {
        alert("Please login as an Applicant to apply.");
        window.showSection('login-section'); return;
    }
    document.getElementById('apply-job-id').value = jobId;
    document.getElementById('apply-job-title').value = jobTitle;
    document.getElementById('apply-modal').classList.remove('hidden');
};

// 1. Convert File to Base64 and save in Local Storage Temporarily
document.getElementById('apply-resume').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // Max size: 2MB to prevent Local Storage overflow
            alert("File is too large! Please select a file smaller than 2MB.");
            this.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(event) {
            localStorage.setItem('tempResumeData', event.target.result);
            localStorage.setItem('tempResumeName', file.name);
        };
        reader.readAsDataURL(file);
    }
});

// 2. Submit form pulling Resume from LocalStorage to Firebase
document.getElementById('apply-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('apply-submit-btn');
    
    const resumeData = localStorage.getItem('tempResumeData');
    const resumeName = localStorage.getItem('tempResumeName') || 'Resume_Document';

    if (!resumeData) {
        alert("Please wait for the resume to load or re-select the file.");
        return;
    }

    try {
        btn.innerText = "Submitting..."; btn.disabled = true;

        await push(dbRef(db, 'applications'), {
            jobId: document.getElementById('apply-job-id').value,
            jobTitle: document.getElementById('apply-job-title').value,
            applicantId: currentUser.uid,
            applicantName: document.getElementById('apply-name').value,
            email: document.getElementById('apply-email').value,
            phone: document.getElementById('apply-phone').value,
            gender: document.getElementById('apply-gender').value,
            dob: document.getElementById('apply-dob').value,
            qualification: document.getElementById('apply-qualification').value,
            experience: document.getElementById('apply-experience').value,
            skills: document.getElementById('apply-skills').value,
            resume: resumeData,      // The Base64 file string grabbed from local storage
            resumeName: resumeName,
            status: "Pending",
            interviewInfo: null
        });
        
        // Clean up temp storage
        localStorage.removeItem('tempResumeData');
        localStorage.removeItem('tempResumeName');
        
        alert("Application Submitted Successfully!");
        closeModal('apply-modal'); e.target.reset(); window.showSection('applicant-dashboard');
    } catch(err) { alert(err.message); } 
    finally { btn.innerText = "Submit Application"; btn.disabled = false; }
});


// ====== APPLICANT DASHBOARD ======
function fetchMyApplications() {
    if(!currentUser) return;
    onValue(dbRef(db, 'applications'), (snapshot) => {
        const tbody = document.getElementById('my-applications-list');
        tbody.innerHTML = '';
        snapshot.forEach(child => {
            const app = child.val();
            if(app.applicantId === currentUser.uid) {
                let statusColor = app.status === 'Approved' ? 'var(--success)' : (app.status === 'Rejected' ? 'var(--danger)' : '#F39C12');
                let infoHtml = app.status === 'Approved' && app.interviewInfo ? 
                    `<div class="schedule-details">
                        <strong>Mode:</strong> ${app.interviewInfo.mode} | <strong>Date:</strong> ${app.interviewInfo.date} | <strong>Time:</strong> ${app.interviewInfo.time}<br>
                        <strong>Place:</strong> ${app.interviewInfo.place}<br>
                        <strong>Address:</strong> ${app.interviewInfo.address}
                    </div>` : (app.status === 'Rejected' ? "Not Selected" : "Awaiting Review");
                
                tbody.innerHTML += `<tr><td>${app.jobTitle}</td><td style="color:${statusColor}; font-weight:bold;">${app.status}</td><td>${infoHtml}</td></tr>`;
            }
        });
    });
}

// ====== ADMIN APPLICATION REVIEW (With Full Details & Base64 Download Link) ======
function fetchAdminApplications() {
    onValue(dbRef(db, 'applications'), (snapshot) => {
        const tbody = document.getElementById('admin-apps-list');
        tbody.innerHTML = '';
        snapshot.forEach(child => {
            const app = child.val();
            
            // Full details view for Admin
            let detailsHtml = `
                <div style="font-size:13px; color:#555; line-height:1.6; margin-bottom: 8px;">
                    <strong>Gender:</strong> ${app.gender} | <strong>DOB:</strong> ${app.dob}<br>
                    <strong>Qual:</strong> ${app.qualification} | <strong>Exp:</strong> ${app.experience} yrs<br>
                    <strong>Skills:</strong> ${app.skills}
                </div>
                <a href="${app.resume}" download="${app.applicantName.replace(/\s+/g, '_')}_${app.resumeName}" class="btn btn-secondary" style="font-size:12px; padding: 5px 10px; text-decoration:none; display:inline-block;">
                    <i class="fa-solid fa-download"></i> Download Resume
                </a>`;
            
            let contactHtml = `
                <strong>${app.applicantName}</strong><br>
                <span style="font-size:12px; color:#555;">
                <i class="fa-solid fa-phone"></i> ${app.phone}<br>
                <i class="fa-solid fa-envelope"></i> ${app.email}
                </span>`;

            let actionsHtml = app.status === 'Pending' ? `
                <button class="btn btn-primary success btn-nav" style="margin-bottom:5px;" onclick="openInterviewModal('${child.key}')">Schedule</button><br>
                <button class="btn btn-primary danger btn-nav" onclick="rejectApp('${child.key}')">Reject</button>
            ` : `<span style="font-size:12px; color:gray; font-weight:bold;">Action Completed</span>`;

            tbody.innerHTML += `<tr>
                <td>${contactHtml}</td>
                <td><strong>${app.jobTitle}</strong></td>
                <td>${detailsHtml}</td>
                <td><strong>${app.status}</strong></td>
                <td>${actionsHtml}</td>
            </tr>`;
        });
    });
}

window.rejectApp = async (appId) => {
    if(confirm("Reject this application?")) await update(dbRef(db, 'applications/' + appId), { status: 'Rejected' });
};

window.openInterviewModal = (appId) => {
    document.getElementById('interview-app-id').value = appId;
    document.getElementById('interview-modal').classList.remove('hidden');
};

document.getElementById('schedule-interview-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const appId = document.getElementById('interview-app-id').value;
    const info = {
        mode: document.getElementById('interview-mode').value,
        date: document.getElementById('interview-date').value,
        time: document.getElementById('interview-time').value,
        place: document.getElementById('interview-place').value,
        address: document.getElementById('interview-address').value
    };
    await update(dbRef(db, 'applications/' + appId), { status: 'Approved', interviewInfo: info });
    alert("Interview Scheduled!");
    closeModal('interview-modal');
});