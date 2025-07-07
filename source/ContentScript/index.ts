import {browser} from 'webextension-polyfill-ts';


// Floating button and sidebar logic for Hiair extension
function createHiairFloatingButton() {
  if (document.getElementById('hiair-floating-btn')) return;

  // Create floating button
  const btn = document.createElement('div');
  btn.id = 'hiair-floating-btn';
  btn.style.cssText = `
    position: fixed;
    top: 32px;
    right: 32px;
    width: 56px;
    height: 56px;
    background: #2dc2e9;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.13);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    transition: box-shadow 0.2s;
    user-select: none;
  `;

  // Icon image
  const icon = document.createElement('img');
  icon.src = browser.runtime.getURL('assets/icons/favicon-128.png');
  icon.alt = 'Hiair';
  icon.style.cssText = 'width: 32px; height: 32px; pointer-events: none;';
  btn.appendChild(icon);

  // X button (hidden by default)
  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: -12px;
    left: -12px;
    width: 28px;
    height: 28px;
    background: #2dc2e9;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.13);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  `;
  btn.appendChild(closeBtn);

  // Show X on hover
  btn.addEventListener('mouseenter', () => {
    closeBtn.style.opacity = '1';
    closeBtn.style.pointerEvents = 'auto';
  });
  btn.addEventListener('mouseleave', () => {
    closeBtn.style.opacity = '0';
    closeBtn.style.pointerEvents = 'none';
  });

  // Hide button on X click
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.remove();
  });

  // Show sidebar on button click
  btn.addEventListener('click', (e) => {
    // Prevent drag from triggering sidebar
    if ((e as any)._dragging) return;
    btn.style.display = 'none';
    createHiairSidebar(() => {
      btn.style.display = 'flex';
    });
  });

  // --- Drag logic for Y axis on right side ---
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    startY = e.clientY;
    startTop = btn.offsetTop;
    btn.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    let newTop = startTop + deltaY;
    // Clamp to viewport
    const minTop = 0;
    const maxTop = window.innerHeight - btn.offsetHeight;
    newTop = Math.max(minTop, Math.min(maxTop, newTop));
    btn.style.top = newTop + 'px';
    btn.style.right = '32px'; // Always snap to right
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      btn.style.cursor = 'grab';
      document.body.style.userSelect = '';
    }
  });

  document.body.appendChild(btn);
}

function createHiairSidebar(onClose: (() => void) | undefined) {
  if (document.getElementById('hiair-sidebar')) return;

  // Font loading logic (same as before)
  let fontUrl = browser.runtime.getURL('/assets/fonts/Archicoco/Archicoco.otf');

  const fontFace = new FontFace('Archicoco', `url('${fontUrl}') format('opentype')`);

  fontFace.load().then(function(loadedFace) {
    document.fonts.add(loadedFace);
    injectSidebar();
  }).catch(function() {
    injectSidebar();
  });

  function injectSidebar() {
    if (document.getElementById('hiair-sidebar')) return;
    const sidebar = document.createElement('div');
    sidebar.id = 'hiair-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.13);
      z-index: 10001;
      font-family: 'Archicoco', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      color: #222;
      padding: 0;
      border: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      height: auto;
      max-height: 90vh;
      bottom: 20px;
    `;

    sidebar.innerHTML = `
      <div style="padding: 18px 18px 0 18px; display: flex; align-items: center;">
        <span style="font-size: 28px; font-family: 'Archicoco', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; letter-spacing: -0.5px;">Hiair</span>
        <div style="margin-left: auto; display: flex; gap: 8px;">
          <button id="hiair-sidebar-close" style="background: none; border: none; cursor: pointer; font-size: 22px; color: #bdbdbd;">&#10005;</button>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin: 18px 18px 0 18px;">
        <button id="hiair-tab-autofill" style="flex:1; background: #e6f7fa; color: #00b6e6; border: none; border-radius: 6px 6px 0 0; padding: 8px 0; font-weight: 600; cursor: pointer;">Autofill</button>
        <button id="hiair-tab-profile" style="flex:1; background: #f5f5f5; color: #bdbdbd; border: none; border-radius: 6px 6px 0 0; padding: 8px 0; font-weight: 600; cursor: pointer;">Profile</button>
        <button id="hiair-tab-apikeys" style="flex:1; background: #f5f5f5; color: #bdbdbd; border: none; border-radius: 6px 6px 0 0; padding: 8px 0; font-weight: 600; cursor: pointer;">API Keys</button>
      </div>
      <div id="hiair-sidebar-content"></div>
    `;

    // Autofill and Profile content
    const autofillContent = `
      <div style="background: #00b6e6; color: #fff; border-radius: 10px; margin: 18px; padding: 18px 16px 16px 16px; display: flex; flex-direction: column; align-items: flex-start;">      
        <button style="background: #fff; color: #00b6e6; border: none; border-radius: 6px; padding: 8px 18px; font-weight: 600; font-size: 15px; cursor: pointer;">⚡ Autofill</button>
      </div>
      <div style="margin: 0 18px 18px 18px; background: #fafbfc; border-radius: 8px; padding: 0;">
        <div style="display: flex; align-items: center; padding: 14px 0 14px 0; border-bottom: 1px solid #ececec;">
          <span style="background: #f3e8ff; color: #b39ddb; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 12px 0 12px; font-size: 18px;">📄</span>
          <span style="flex:1;">Resume</span>
          <span style="color: #00b6e6; font-weight: 500; cursor: pointer; margin-right: 16px;">Preview</span>
        </div>
        <div style="display: flex; align-items: center; padding: 14px 0 14px 0; border-bottom: 1px solid #ececec;">
          <span style="background: #ffe0e0; color: #e57373; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 12px 0 12px; font-size: 18px;">✏️</span>
          <span style="flex:1;">Cover Letter</span>
          <span style="color: #bdbdbd; margin-right: 16px;">No Field Found</span>
        </div>
      </div>
    `;

    function getProfileFormHTML(profile: any, message: string): string {
      // Helper to render education entries
      function renderEducation(education: any[]) {
        return education.map((edu: any, idx: number) => `
          <div class="dynamic-entry" data-id="${edu.id}">
            ${education.length > 1 ? `<button type="button" class="remove-edu-btn" style="float:right; color:#e57373; background:none; border:none; font-size:18px; cursor:pointer;">×</button>` : ''}
            <div class="dynamic-heading">Education ${idx + 1}</div>
            <label>University/Institution<br/>
              <input name="university-${edu.id}" type="text" value="${edu.university || ''}" />
            </label>
            <label>Degree Type<br/>
              <select name="degreeType-${edu.id}">
                <option value="">Select degree type</option>
                <option value="Associate"${edu.degreeType==='Associate'?' selected':''}>Associate</option>
                <option value="Bachelor"${edu.degreeType==='Bachelor'?' selected':''}>Bachelor</option>
                <option value="Master"${edu.degreeType==='Master'?' selected':''}>Master</option>
                <option value="PhD"${edu.degreeType==='PhD'?' selected':''}>PhD</option>
                <option value="Other"${edu.degreeType==='Other'?' selected':''}>Other</option>
              </select>
            </label>
            <label>Field of Study<br/>
              <input name="degreeField-${edu.id}" type="text" value="${edu.degreeField || ''}" />
            </label>
            <div class="row-fields">
              <label>Start Date<br/>
                <input name="startDate-${edu.id}" type="date" value="${edu.startDate || ''}" />
              </label>
              <label>End Date<br/>
                <input name="endDate-${edu.id}" type="date" value="${edu.endDate || ''}" />
              </label>
            </div>
          </div>
        `).join('');
      }
      // Helper to render work experience entries
      function renderWork(workExperience: any[]) {
        return workExperience.map((work: any, idx: number) => `
          <div class="dynamic-entry" data-id="${work.id}">
            ${workExperience.length > 1 ? `<button type="button" class="remove-work-btn" style="float:right; color:#e57373; background:none; border:none; font-size:18px; cursor:pointer;">×</button>` : ''}
            <div class="dynamic-heading">Experience ${idx + 1}</div>
            <label>Job Title<br/>
              <input name="jobTitle-${work.id}" type="text" value="${work.jobTitle || ''}" />
            </label>
            <label>Company Name<br/>
              <input name="companyName-${work.id}" type="text" value="${work.companyName || ''}" />
            </label>
            <div class="row-fields">
              <label>Start Date<br/>
                <input name="workStartDate-${work.id}" type="date" value="${work.startDate || ''}" />
              </label>
              <label>End Date<br/>
                <input name="workEndDate-${work.id}" type="date" value="${work.endDate || ''}" />
              </label>
            </div>
            <label>Work Location<br/>
              <select name="workLocation-${work.id}">
                <option value="">Select work location</option>
                <option value="Remote"${work.workLocation==='Remote'?' selected':''}>Remote</option>
                <option value="On-site"${work.workLocation==='On-site'?' selected':''}>On-site</option>
                <option value="Hybrid"${work.workLocation==='Hybrid'?' selected':''}>Hybrid</option>
              </select>
            </label>
            <label>Job Description/Bullet Points<br/>
              <textarea name="jobDescription-${work.id}" rows="2">${work.jobDescription || ''}</textarea>
            </label>
          </div>
        `).join('');
      }
      // Accordion section helper
      function accordionSection(title: string, content: string, open: boolean, idx: number) {
        return `
          <div class="hiair-accordion-section${open ? ' open' : ''}" data-idx="${idx}">
            <button type="button" class="hiair-accordion-header">${title}<span class="hiair-accordion-arrow">${open ? '▲' : '▼'}</span></button>
            <div class="hiair-accordion-content" style="display:${open ? 'block' : 'none'};">${content}</div>
          </div>
        `;
      }
      // Accordion content for each section
      const sections = [
        {
          title: 'Personal Information',
          content: `
            <div class="profile-names-row">
              <label>First Name*<br/><input name="firstName" type="text" value="${profile.firstName || ''}" required /></label>
              <label>Last Name*<br/><input name="lastName" type="text" value="${profile.lastName || ''}" required /></label>
            </div>
            <label>Phone number<br/><input name="phone" type="text" value="${profile.phone || ''}" style="width:100%;padding:6px;" /></label>
            <label>Portfolio<br/><input name="portfolio" type="url" value="${profile.portfolio || ''}" style="width:100%;padding:6px;" /></label>
            <label>LinkedIn URL<br/><input name="linkedInUrl" type="url" value="${profile.linkedInUrl || ''}" style="width:100%;padding:6px;" /></label>
            <label>GitHub URL<br/><input name="githubUrl" type="url" value="${profile.githubUrl || ''}" style="width:100%;padding:6px;" /></label>
            <label>Other URL<br/><input name="otherUrl" type="url" value="${profile.otherUrl || ''}" style="width:100%;padding:6px;" /></label>
            <label>Other Personal Details<br/><textarea name="personalDetails" rows="2" style="width:100%;padding:6px;">${profile.personalDetails || ''}</textarea></label>
          `
        },
        {
          title: 'Resume',
          content: `
            <label>Upload Resume (PDF only)<br/>
              <input name="resume" type="file" accept="application/pdf" style="margin-top:8px;" />
            </label>
            ${profile.resumeUploadDate ? `<div style='font-size:13px;color:#888;margin-bottom:8px;'>Uploaded: ${profile.resumeUploadDate}</div>` : ''}
            ${profile.resume ? `<div style='font-size:13px;color:#00b6e6;margin-bottom:8px;'>PDF file stored.</div>` : ''}
          `
        },
        {
          title: 'Education',
          content: `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;">Education</span>
              <button type="button" id="add-edu-btn" style="background:#e6f7fa;color:#00b6e6;border:none;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;">+ Add</button>
            </div>
            <div id="education-list">${renderEducation(profile.education)}</div>
          `
        },
        {
          title: 'Work Experience',
          content: `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;">Work Experience</span>
              <button type="button" id="add-work-btn" style="background:#e6f7fa;color:#00b6e6;border:none;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;">+ Add</button>
            </div>
            <div id="work-list">${renderWork(profile.workExperience)}</div>
          `
        },
        {
          title: 'Projects',
          content: `<label>Projects<br/><textarea name="projects" rows="2" style="width:100%;padding:6px;">${profile.projects || ''}</textarea></label>`
        },
        {
          title: 'Skills',
          content: `<label>Skills<br/><textarea name="skills" rows="2" style="width:100%;padding:6px;">${profile.skills || ''}</textarea></label>`
        },
        {
          title: 'Other/Personal Details',
          content: `
            <label>Gender<br/><select name="gender" style="width:100%;padding:6px;">
              <option value="">Select gender</option>
              <option value="Male"${profile.gender==='Male'?' selected':''}>Male</option>
              <option value="Female"${profile.gender==='Female'?' selected':''}>Female</option>
              <option value="Non-binary"${profile.gender==='Non-binary'?' selected':''}>Non-binary</option>
              <option value="Prefer not to say"${profile.gender==='Prefer not to say'?' selected':''}>Prefer not to say</option>
            </select></label>
            <label>Orientation<br/><input name="orientation" type="text" value="${profile.orientation || ''}" style="width:100%;padding:6px;" /></label>
            <label>Race/Ethnicity<br/><input name="race" type="text" value="${profile.race || ''}" style="width:100%;padding:6px;" /></label>
            <label>Relocation Willingness<br/><select name="relocationWillingness" style="width:100%;padding:6px;">
              <option value="">Select willingness</option>
              <option value="Yes"${profile.relocationWillingness==='Yes'?' selected':''}>Yes</option>
              <option value="No"${profile.relocationWillingness==='No'?' selected':''}>No</option>
              <option value="Maybe"${profile.relocationWillingness==='Maybe'?' selected':''}>Maybe</option>
            </select></label>
            <label>Commute Willingness<br/><input name="commuteWillingness" type="text" value="${profile.commuteWillingness || ''}" style="width:100%;padding:6px;" /></label>
            <label>Veteran Status<br/><select name="veteranStatus" style="width:100%;padding:6px;">
              <option value="">Select status</option>
              <option value="Yes"${profile.veteranStatus==='Yes'?' selected':''}>Yes</option>
              <option value="No"${profile.veteranStatus==='No'?' selected':''}>No</option>
              <option value="Prefer not to say"${profile.veteranStatus==='Prefer not to say'?' selected':''}>Prefer not to say</option>
            </select></label>
            <label>Disability Status<br/><select name="disabilityStatus" style="width:100%;padding:6px;">
              <option value="">Select status</option>
              <option value="Yes"${profile.disabilityStatus==='Yes'?' selected':''}>Yes</option>
              <option value="No"${profile.disabilityStatus==='No'?' selected':''}>No</option>
              <option value="Prefer not to say"${profile.disabilityStatus==='Prefer not to say'?' selected':''}>Prefer not to say</option>
            </select></label>
            <label>Expected Salary<br/><input name="expectedSalary" type="text" value="${profile.expectedSalary || ''}" style="width:100%;padding:6px;" /></label>
            <label>Sponsorship Requirements<br/><select name="sponsorshipRequirements" style="width:100%;padding:6px;">
              <option value="">Select requirement</option>
              <option value="Yes"${profile.sponsorshipRequirements==='Yes'?' selected':''}>Yes</option>
              <option value="No"${profile.sponsorshipRequirements==='No'?' selected':''}>No</option>
              <option value="In the future"${profile.sponsorshipRequirements==='In the future'?' selected':''}>In the future</option>
            </select></label>
          `
        }
      ];
      // Compose the form with accordions
      return `
        <form id="hiair-profile-form" style="padding: 0 0 12px 0; display: flex; flex-direction: column; gap: 0;">
          <div style="font-size: 18px; font-weight: 600; margin: 18px 18px 8px 18px;">Edit Profile</div>
          ${message ? `<div style='color: #00b6e6; font-size: 14px; margin: 0 18px 16px 18px; display: block;'>${message}</div>` : ''}
          <div id="hiair-profile-accordion">
            ${sections.map((s, i) => accordionSection(s.title, s.content, i === 0, i)).join('')}
          </div>
          <button type="submit" style="background: #00b6e6; color: #fff; border: none; border-radius: 6px; padding: 10px 0; font-weight: 600; font-size: 15px; cursor: pointer; margin: 18px;">Save Profile</button>
        </form>
      `;
    }

    // Profile tab logic
    async function renderProfileTab(message: string = ''): Promise<void> {
      // Default profile structure
      let profile: any = {
        firstName: '', lastName: '', phone: '', portfolio: '', linkedInUrl: '', githubUrl: '', otherUrl: '', resume: '', resumeUploadDate: '', personalDetails: '',
        education: [{ id: '1', university: '', degreeType: '', degreeField: '', startDate: '', endDate: '' }],
        workExperience: [{ id: '1', jobTitle: '', companyName: '', startDate: '', endDate: '', workLocation: '', jobDescription: '' }],
        projects: '', skills: '', gender: '', orientation: '', race: '', relocationWillingness: '', commuteWillingness: '', veteranStatus: '', disabilityStatus: '', expectedSalary: '', sponsorshipRequirements: ''
      };
      try {
        const result = await browser.storage.sync.get('userProfile');
        if (result.userProfile) {
          profile = { ...profile, ...result.userProfile };
          // Migrate old 'name' field if present
          if (!profile.firstName && !profile.lastName && profile.name) {
            const parts = profile.name.split(' ');
            profile.firstName = parts[0] || '';
            profile.lastName = parts.slice(1).join(' ') || '';
          }
          // Ensure arrays are present
          if (!Array.isArray(profile.education) || profile.education.length === 0) profile.education = [{ id: '1', university: '', degreeType: '', degreeField: '', startDate: '', endDate: '' }];
          if (!Array.isArray(profile.workExperience) || profile.workExperience.length === 0) profile.workExperience = [{ id: '1', jobTitle: '', companyName: '', startDate: '', endDate: '', workLocation: '', jobDescription: '' }];
        }
      } catch {}
      if (contentDiv) contentDiv.innerHTML = getProfileFormHTML(profile, message);
      // Ensure scroll/height styles for profile tab (in case of direct render)
      if (contentDiv && sidebar) {
        (sidebar as HTMLElement).style.height = 'calc(100vh - 40px)'; // 20px top + 20px bottom
        (sidebar as HTMLElement).style.maxHeight = 'calc(100vh - 40px)';
        (contentDiv as HTMLElement).style.height = 'calc(100vh - 40px - 70px)'; // 40px margin, 70px header/tabs
        (contentDiv as HTMLElement).style.overflowY = 'auto';
      }
      // Accordion logic
      const accordionHeaders = contentDiv?.querySelectorAll('.hiair-accordion-header');
      accordionHeaders?.forEach((header) => {
        header.addEventListener('click', () => {
          const section = header.parentElement;
          const isOpen = section?.classList.contains('open');
          contentDiv?.querySelectorAll('.hiair-accordion-section').forEach((sec) => {
            sec.classList.remove('open');
            (sec.querySelector('.hiair-accordion-content') as HTMLElement).style.display = 'none';
            (sec.querySelector('.hiair-accordion-arrow') as HTMLElement).textContent = '▼';
          });
          if (!isOpen) {
            section?.classList.add('open');
            (section?.querySelector('.hiair-accordion-content') as HTMLElement).style.display = 'block';
            (section?.querySelector('.hiair-accordion-arrow') as HTMLElement).textContent = '▲';
          }
        });
      });
      // Add education entry
      contentDiv?.querySelector('#add-edu-btn')?.addEventListener('click', () => {
        profile.education.push({ id: Date.now().toString(), university: '', degreeType: '', degreeField: '', startDate: '', endDate: '' });
        renderProfileTab();
      });
      // Remove education entry
      contentDiv?.querySelectorAll('.remove-edu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = (btn.closest('.dynamic-entry') as HTMLElement);
          const id = entry?.getAttribute('data-id');
          profile.education = profile.education.filter((edu: any) => edu.id !== id);
          renderProfileTab();
        });
      });
      // Add work experience entry
      contentDiv?.querySelector('#add-work-btn')?.addEventListener('click', () => {
        profile.workExperience.push({ id: Date.now().toString(), jobTitle: '', companyName: '', startDate: '', endDate: '', workLocation: '', jobDescription: '' });
        renderProfileTab();
      });
      // Remove work experience entry
      contentDiv?.querySelectorAll('.remove-work-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = (btn.closest('.dynamic-entry') as HTMLElement);
          const id = entry?.getAttribute('data-id');
          profile.workExperience = profile.workExperience.filter((work: any) => work.id !== id);
          renderProfileTab();
        });
      });
      // Save form
      const form = contentDiv?.querySelector('#hiair-profile-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(form as HTMLFormElement);
          // Gather education
          const newEducation: any[] = [];
          (profile.education || []).forEach((edu: any) => {
            newEducation.push({
              id: edu.id,
              university: formData.get(`university-${edu.id}`) || '',
              degreeType: formData.get(`degreeType-${edu.id}`) || '',
              degreeField: formData.get(`degreeField-${edu.id}`) || '',
              startDate: formData.get(`startDate-${edu.id}`) || '',
              endDate: formData.get(`endDate-${edu.id}`) || ''
            });
          });
          // Gather work experience
          const newWork: any[] = [];
          (profile.workExperience || []).forEach((work: any) => {
            newWork.push({
              id: work.id,
              jobTitle: formData.get(`jobTitle-${work.id}`) || '',
              companyName: formData.get(`companyName-${work.id}`) || '',
              startDate: formData.get(`workStartDate-${work.id}`) || '',
              endDate: formData.get(`workEndDate-${work.id}`) || '',
              workLocation: formData.get(`workLocation-${work.id}`) || '',
              jobDescription: formData.get(`jobDescription-${work.id}`) || ''
            });
          });
          // Handle resume upload
          let resume = profile.resume || '';
          let resumeUploadDate = profile.resumeUploadDate || '';
          const fileInput = (form.querySelector('input[name="resume"]') as HTMLInputElement);
          if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            if (file.type === 'application/pdf') {
              const reader = new FileReader();
              reader.onload = async (event) => {
                resume = event.target?.result as string;
                resumeUploadDate = new Date().toISOString().split('T')[0];
                await saveProfile();
              };
              reader.readAsDataURL(file);
              return; // Wait for async file read
            }
          }
          await saveProfile();

          async function saveProfile() {
            const updatedProfile = {
              ...profile,
              firstName: formData.get('firstName') || '',
              lastName: formData.get('lastName') || '',
              phone: formData.get('phone') || '',
              portfolio: formData.get('portfolio') || '',
              linkedInUrl: formData.get('linkedInUrl') || '',
              githubUrl: formData.get('githubUrl') || '',
              otherUrl: formData.get('otherUrl') || '',
              personalDetails: formData.get('personalDetails') || '',
              education: newEducation,
              workExperience: newWork,
              projects: formData.get('projects') || '',
              skills: formData.get('skills') || '',
              gender: formData.get('gender') || '',
              orientation: formData.get('orientation') || '',
              race: formData.get('race') || '',
              relocationWillingness: formData.get('relocationWillingness') || '',
              commuteWillingness: formData.get('commuteWillingness') || '',
              veteranStatus: formData.get('veteranStatus') || '',
              disabilityStatus: formData.get('disabilityStatus') || '',
              expectedSalary: formData.get('expectedSalary') || '',
              sponsorshipRequirements: formData.get('sponsorshipRequirements') || '',
              resume,
              resumeUploadDate
            };
            try {
              const prev = await browser.storage.sync.get('userProfile');
              await browser.storage.sync.set({ userProfile: { ...prev.userProfile, ...updatedProfile } });
              renderProfileTab('Profile saved!');
            } catch {
              renderProfileTab('Error saving profile.');
            }
          }
        });
      }
      // Minimal sidebar accordion CSS
      const styleId = 'hiair-profile-accordion-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .hiair-accordion-section { border-bottom: 1px solid #ececec; }
          .hiair-accordion-header { width: 100%; background: none; border: none; outline: none; text-align: left; font-size: 16px; font-weight: 600; padding: 14px 18px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
          .hiair-accordion-arrow { font-size: 14px; margin-left: 8px; }
          .hiair-accordion-content { padding: 0 18px 18px 18px; }
          .dynamic-entry { background: #fff !important; border-radius: 12px !important; margin-bottom: 24px !important; padding: 22px 18px 14px 18px !important; position: relative !important; border: 1px solid #e0e0e0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important; }
          .dynamic-entry .dynamic-heading { font-size: 18px !important; font-weight: 700 !important; margin-bottom: 18px !important; color: #222 !important; letter-spacing: -0.5px !important; }
          #hiair-profile-form label { display: flex !important; flex-direction: column !important; margin-bottom: 20px !important; font-size: 14px !important; font-weight: 500 !important; color: #222 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important; }
          #hiair-profile-form input, #hiair-profile-form select, #hiair-profile-form textarea { font-size: 15px !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important; margin-top: 6px !important; margin-bottom: 0 !important; padding: 8px 10px !important; border: 1px solid #bdbdbd !important; border-radius: 8px !important; background: #fff !important; color: #222 !important; box-sizing: border-box !important; transition: border-color 0.2s, box-shadow 0.2s !important; }
          #hiair-profile-form input:focus, #hiair-profile-form select:focus, #hiair-profile-form textarea:focus { outline: none !important; border-color: #00b6e6 !important; box-shadow: 0 0 0 2px #00b6e633 !important; }
          .dynamic-entry .row-fields { display: flex !important; gap: 16px !important; }
          .dynamic-entry .row-fields > label { flex: 1 1 0 !important; margin-bottom: 0 !important; }
          .profile-names-row { display: flex; gap: 16px; }
          .profile-names-row > label { flex: 1 1 0; min-width: 0; margin-bottom: 0 !important; }
        `;
        document.head.appendChild(style);
      }
    }

    // API Keys tab logic
    async function renderApiKeysTab(message = '') {
      let apiKeys = { openai: '', anthropic: '' };
      try {
        const result = await browser.storage.sync.get('apiKeys');
        if (result.apiKeys) apiKeys = result.apiKeys;
      } catch {}
      const openaiLogo = browser.runtime.getURL('assets/icons/openailogo.png');
      const anthropicLogo = browser.runtime.getURL('assets/icons/anthropiclogo.png');
      if (contentDiv) contentDiv.innerHTML = `
        <form id="hiair-apikeys-form" style="padding: 18px; display: flex; flex-direction: column; gap: 24px;">
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">API Keys</div>
          ${message ? `<div style='color: #00b6e6; font-size: 14px; margin-bottom: 8px;'>${message}</div>` : ''}
          <label style="font-size: 14px; font-weight: 500; color: #222;">
            <span style="margin-bottom: 8px; display: block;">OpenAI API Key</span>
            <div class="apikey-input-row">
              <img src="${openaiLogo}" alt="OpenAI Logo" class="apikey-logo" />
              <input name="openai" type="text" value="${apiKeys.openai || ''}" style="width: 100%;" />
            </div>
          </label>
          <label style="font-size: 14px; font-weight: 500; color: #222;">
            <span style="margin-bottom: 8px; display: block;">Anthropic API Key</span>
            <div class="apikey-input-row">
              <img src="${anthropicLogo}" alt="Anthropic Logo" class="apikey-logo" />
              <input name="anthropic" type="text" value="${apiKeys.anthropic || ''}" style="width: 100%;" />
            </div>
          </label>
          <button type="submit" style="background: #00b6e6; color: #fff; border: none; border-radius: 6px; padding: 10px 0; font-weight: 600; font-size: 15px; cursor: pointer; margin-top: 8px;">Save API Keys</button>
        </form>
      `;
      const form = contentDiv?.querySelector('#hiair-apikeys-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(form as HTMLFormElement);
          const updatedKeys = {
            openai: formData.get('openai') || '',
            anthropic: formData.get('anthropic') || ''
          };
          try {
            await browser.storage.sync.set({ apiKeys: updatedKeys });
            renderApiKeysTab('API keys saved!');
          } catch {
            renderApiKeysTab('Error saving API keys.');
          }
        });
      }
      // Inject API key input row CSS if not present
      const apikeyStyleId = 'hiair-apikeys-style';
      if (!document.getElementById(apikeyStyleId)) {
        const style = document.createElement('style');
        style.id = apikeyStyleId;
        style.textContent = `
          .apikey-input-row { display: flex; align-items: center; gap: 10px; background: #f8fafd; border-radius: 8px; padding: 0 10px; border: 1px solid #e0e0e0; }
          .apikey-input-row input { border: none !important; background: transparent !important; box-shadow: none !important; padding: 12px 0 12px 0 !important; font-size: 15px !important; color: #222 !important; width: 100% !important; }
          .apikey-input-row input:focus { outline: none !important; border: none !important; background: transparent !important; }
          .apikey-logo { width: 24px; height: 24px; display: block; }
        `;
        document.head.appendChild(style);
      }
    }

    // Set initial content
    const contentDiv = sidebar.querySelector('#hiair-sidebar-content');
    if (contentDiv) contentDiv.innerHTML = autofillContent;

    // Tab switching logic
    const autofillTab = sidebar.querySelector('#hiair-tab-autofill') as HTMLButtonElement;
    const profileTab = sidebar.querySelector('#hiair-tab-profile') as HTMLButtonElement;
    const apiKeysTab = sidebar.querySelector('#hiair-tab-apikeys') as HTMLButtonElement;
    if (autofillTab && profileTab && apiKeysTab && contentDiv) {
      autofillTab.addEventListener('click', () => {
        autofillTab.style.background = '#e6f7fa';
        autofillTab.style.color = '#00b6e6';
        profileTab.style.background = '#f5f5f5';
        profileTab.style.color = '#bdbdbd';
        apiKeysTab.style.background = '#f5f5f5';
        apiKeysTab.style.color = '#bdbdbd';
        contentDiv.innerHTML = autofillContent;
        // Remove scroll/height styles if present
        (contentDiv as HTMLElement).style.height = '';
        (contentDiv as HTMLElement).style.overflowY = '';
        (sidebar as HTMLElement).style.height = 'auto';
        (sidebar as HTMLElement).style.maxHeight = '90vh';
      });
      profileTab.addEventListener('click', () => {
        profileTab.style.background = '#e6f7fa';
        profileTab.style.color = '#00b6e6';
        autofillTab.style.background = '#f5f5f5';
        autofillTab.style.color = '#bdbdbd';
        apiKeysTab.style.background = '#f5f5f5';
        apiKeysTab.style.color = '#bdbdbd';
        renderProfileTab();
        // Ensure scroll/height styles for profile tab
        setTimeout(() => {
          (sidebar as HTMLElement).style.height = 'calc(100vh - 40px)';
          (sidebar as HTMLElement).style.maxHeight = 'calc(100vh - 40px)';
          (contentDiv as HTMLElement).style.height = 'calc(100vh - 40px - 70px)';
          (contentDiv as HTMLElement).style.overflowY = 'auto';
        }, 0);
      });
      apiKeysTab.addEventListener('click', () => {
        apiKeysTab.style.background = '#e6f7fa';
        apiKeysTab.style.color = '#00b6e6';
        autofillTab.style.background = '#f5f5f5';
        autofillTab.style.color = '#bdbdbd';
        profileTab.style.background = '#f5f5f5';
        profileTab.style.color = '#bdbdbd';
        renderApiKeysTab();
        // Remove scroll/height styles if present
        (contentDiv as HTMLElement).style.height = '';
        (contentDiv as HTMLElement).style.overflowY = '';
        (sidebar as HTMLElement).style.height = 'auto';
        (sidebar as HTMLElement).style.maxHeight = '90vh';
      });
    }

    // Sidebar close button
    sidebar.querySelector('#hiair-sidebar-close')?.addEventListener('click', () => {
      sidebar.remove();
      if (typeof onClose === 'function') onClose();
    });

    document.body.appendChild(sidebar);
  }
}

if (window.location.hostname.includes('ashbyhq.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createHiairFloatingButton);
  } else {
    createHiairFloatingButton();
  }
}

export {};
