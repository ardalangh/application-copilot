import * as React from 'react';
import {browser} from 'webextension-polyfill-ts';

import './styles.scss';

interface EducationEntry {
  id: string;
  university: string;
  degreeType: string;
  degreeField: string;
  startDate: string;
  endDate: string;
}

interface WorkExperience {
  id: string;
  jobTitle: string;
  companyName: string;
  startDate: string;
  endDate: string;
  workLocation: string;
  jobDescription: string;
}

interface UserProfile {
  // Personal Information
  name: string;
  contactInfo: string;
  portfolio: string;
  linkedInUrl: string;
  githubUrl: string;
  otherUrl: string;
  resume: string;
  resumeUploadDate: string;
  personalDetails: string;

  // Education (now an array)
  education: EducationEntry[];

  // Employment (now an array)
  workExperience: WorkExperience[];

  // Projects
  projects: string;

  // Skills
  skills: string;

  // Other/Personal Details
  gender: string;
  orientation: string;
  race: string;
  relocationWillingness: string;
  commuteWillingness: string;
  veteranStatus: string;
  disabilityStatus: string;
  expectedSalary: string;
  sponsorshipRequirements: string;
}

const AccordionSection: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="accordion-section">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        <span className="accordion-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
};

const Popup: React.FC = () => {
  const [formData, setFormData] = React.useState<UserProfile>({
    name: '',
    contactInfo: '',
    portfolio: '',
    linkedInUrl: '',
    githubUrl: '',
    otherUrl: '',
    resume: '',
    resumeUploadDate: '',
    personalDetails: '',
    education: [{
      id: '1',
      university: '',
      degreeType: '',
      degreeField: '',
      startDate: '',
      endDate: ''
    }],
    workExperience: [{
      id: '1',
      jobTitle: '',
      companyName: '',
      startDate: '',
      endDate: '',
      workLocation: '',
      jobDescription: ''
    }],
    projects: '',
    skills: '',
    gender: '',
    orientation: '',
    race: '',
    relocationWillingness: '',
    commuteWillingness: '',
    veteranStatus: '',
    disabilityStatus: '',
    expectedSalary: '',
    sponsorshipRequirements: ''
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const [apiKeys, setApiKeys] = React.useState<{ openai: string; anthropic: string }>({ openai: '', anthropic: '' });
  const [apiMessage, setApiMessage] = React.useState('');

  React.useEffect(() => {
    loadUserProfile();
    loadApiKeys();
  }, []);

  const loadUserProfile = async () => {
    try {
      const result = await browser.storage.sync.get('userProfile');
      if (result.userProfile) {
        setFormData(result.userProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadApiKeys = async () => {
    try {
      const result = await browser.storage.sync.get('apiKeys');
      if (result.apiKeys) setApiKeys(result.apiKeys);
    } catch (e) { /* ignore */ }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEducationChange = (id: string, field: keyof EducationEntry, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const handleWorkExperienceChange = (id: string, field: keyof WorkExperience, value: string) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map(work =>
        work.id === id ? { ...work, [field]: value } : work
      )
    }));
  };

  const addEducationEntry = () => {
    const newId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: newId,
        university: '',
        degreeType: '',
        degreeField: '',
        startDate: '',
        endDate: ''
      }]
    }));
  };

  const removeEducationEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addWorkExperienceEntry = () => {
    const newId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      workExperience: [...prev.workExperience, {
        id: newId,
        jobTitle: '',
        companyName: '',
        startDate: '',
        endDate: '',
        workLocation: '',
        jobDescription: ''
      }]
    }));
  };

  const removeWorkExperienceEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.filter(work => work.id !== id)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          resume: result,
          resumeUploadDate: new Date().toISOString().split('T')[0]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiKeys((prev) => ({ ...prev, [name]: value }));
  };

  const handleApiKeysSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await browser.storage.sync.set({ apiKeys });
      setApiMessage('API keys saved!');
      setTimeout(() => setApiMessage(''), 2000);
    } catch {
      setApiMessage('Error saving API keys.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      await browser.storage.sync.set({ userProfile: formData });
      setMessage('Profile saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving user profile:', error);
      setMessage('Error saving profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <section id="popup">
      <div className="hiair-header">Hiair</div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="user-profile-form">
        <AccordionSection title="Personal Information">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactInfo">Contact Information</label>
            <input
              type="text"
              id="contactInfo"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleInputChange}
              placeholder="Email, phone, etc."
            />
          </div>

          <div className="form-group">
            <label htmlFor="portfolio">Portfolio</label>
            <input
              type="url"
              id="portfolio"
              name="portfolio"
              value={formData.portfolio}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="linkedInUrl">LinkedIn URL</label>
            <input
              type="url"
              id="linkedInUrl"
              name="linkedInUrl"
              value={formData.linkedInUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="githubUrl">GitHub URL</label>
            <input
              type="url"
              id="githubUrl"
              name="githubUrl"
              value={formData.githubUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="otherUrl">Other URL</label>
            <input
              type="url"
              id="otherUrl"
              name="otherUrl"
              value={formData.otherUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="resume">Resume</label>
            <input
              type="file"
              id="resume"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
            />
            {formData.resumeUploadDate && (
              <small>Uploaded: {formData.resumeUploadDate}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="personalDetails">Other Personal Details</label>
            <textarea
              id="personalDetails"
              name="personalDetails"
              value={formData.personalDetails}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
        </AccordionSection>

        <AccordionSection title="Education">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Education</h3>
            <button
              type="button"
              onClick={addEducationEntry}
              className="add-button"
            >
              + Add Education
            </button>
          </div>

          {formData.education.map((edu, index) => (
            <div key={edu.id} className="dynamic-entry">
              {formData.education.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEducationEntry(edu.id)}
                  className="remove-button"
                >
                  ×
                </button>
              )}

              <h4>Education {index + 1}</h4>

              <div className="form-group">
                <label>University/Institution</label>
                <input
                  type="text"
                  value={edu.university}
                  onChange={(e) => handleEducationChange(edu.id, 'university', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Degree Type</label>
                <select
                  value={edu.degreeType}
                  onChange={(e) => handleEducationChange(edu.id, 'degreeType', e.target.value)}
                >
                  <option value="">Select degree type</option>
                  <option value="Associate">Associate</option>
                  <option value="Bachelor">Bachelor</option>
                  <option value="Master">Master</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Field of Study</label>
                <input
                  type="text"
                  value={edu.degreeField}
                  onChange={(e) => handleEducationChange(edu.id, 'degreeField', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={edu.startDate}
                    onChange={(e) => handleEducationChange(edu.id, 'startDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={edu.endDate}
                    onChange={(e) => handleEducationChange(edu.id, 'endDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </AccordionSection>

        <AccordionSection title="Work Experience">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Work Experience</h3>
            <button
              type="button"
              onClick={addWorkExperienceEntry}
              className="add-button"
            >
              + Add Experience
            </button>
          </div>

          {formData.workExperience.map((work, index) => (
            <div key={work.id} className="dynamic-entry">
              {formData.workExperience.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWorkExperienceEntry(work.id)}
                  className="remove-button"
                >
                  ×
                </button>
              )}

              <h4>Experience {index + 1}</h4>

              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  value={work.jobTitle}
                  onChange={(e) => handleWorkExperienceChange(work.id, 'jobTitle', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={work.companyName}
                  onChange={(e) => handleWorkExperienceChange(work.id, 'companyName', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={work.startDate}
                    onChange={(e) => handleWorkExperienceChange(work.id, 'startDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={work.endDate}
                    onChange={(e) => handleWorkExperienceChange(work.id, 'endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Work Location</label>
                <select
                  value={work.workLocation}
                  onChange={(e) => handleWorkExperienceChange(work.id, 'workLocation', e.target.value)}
                >
                  <option value="">Select work location</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div className="form-group">
                <label>Job Description/Bullet Points</label>
                <textarea
                  value={work.jobDescription}
                  onChange={(e) => handleWorkExperienceChange(work.id, 'jobDescription', e.target.value)}
                  rows={4}
                  placeholder="Describe your responsibilities and achievements"
                />
              </div>
            </div>
          ))}
        </AccordionSection>

        <AccordionSection title="Projects">
          <div className="form-group">
            <label htmlFor="projects">Projects</label>
            <textarea
              id="projects"
              name="projects"
              value={formData.projects}
              onChange={handleInputChange}
              rows={5}
              placeholder="Describe your projects, technologies used, and outcomes"
            />
          </div>
        </AccordionSection>

        <AccordionSection title="Skills">
          <div className="form-group">
            <label htmlFor="skills">Skill Categories/Tags</label>
            <textarea
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleInputChange}
              rows={3}
              placeholder="e.g., JavaScript, React, Node.js, Python, etc."
            />
          </div>
        </AccordionSection>

        <AccordionSection title="Other/Personal Details">
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="orientation">Orientation</label>
            <input
              type="text"
              id="orientation"
              name="orientation"
              value={formData.orientation}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="race">Race/Ethnicity</label>
            <input
              type="text"
              id="race"
              name="race"
              value={formData.race}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="relocationWillingness">Relocation Willingness</label>
            <select
              id="relocationWillingness"
              name="relocationWillingness"
              value={formData.relocationWillingness}
              onChange={handleInputChange}
            >
              <option value="">Select willingness</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Maybe">Maybe</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commuteWillingness">Commute Willingness</label>
            <input
              type="text"
              id="commuteWillingness"
              name="commuteWillingness"
              value={formData.commuteWillingness}
              onChange={handleInputChange}
              placeholder="e.g., Up to 30 minutes, Remote only, etc."
            />
          </div>

          <div className="form-group">
            <label htmlFor="veteranStatus">Veteran Status</label>
            <select
              id="veteranStatus"
              name="veteranStatus"
              value={formData.veteranStatus}
              onChange={handleInputChange}
            >
              <option value="">Select status</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="disabilityStatus">Disability Status</label>
            <select
              id="disabilityStatus"
              name="disabilityStatus"
              value={formData.disabilityStatus}
              onChange={handleInputChange}
            >
              <option value="">Select status</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="expectedSalary">Expected Salary</label>
            <input
              type="text"
              id="expectedSalary"
              name="expectedSalary"
              value={formData.expectedSalary}
              onChange={handleInputChange}
              placeholder="e.g., $80,000 - $100,000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sponsorshipRequirements">Sponsorship Requirements</label>
            <select
              id="sponsorshipRequirements"
              name="sponsorshipRequirements"
              value={formData.sponsorshipRequirements}
              onChange={handleInputChange}
            >
              <option value="">Select requirement</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="In the future">In the future</option>
            </select>
          </div>
        </AccordionSection>

        <AccordionSection title={<span>API Keys</span>}>
          <form onSubmit={handleApiKeysSave} className="api-keys-form">
            <div className="form-group api-key-group">
              <img src={
                browser.runtime.getURL('/assets/icons/openailogo.png')
              } alt="OpenAI Logo" className="api-logo" />
              <input
                type="password"
                name="openai"
                placeholder="OpenAI API Key"
                value={apiKeys.openai}
                onChange={handleApiKeyChange}
                autoComplete="off"
              />
            </div>
            <div className="form-group api-key-group">
              <img src={
                browser.runtime.getURL('/assets/icons/anthropiclogo.png')
              } alt="Anthropic Logo" className="api-logo" />
              <input
                type="password"
                name="anthropic"
                placeholder="Anthropic API Key"
                value={apiKeys.anthropic}
                onChange={handleApiKeyChange}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="add-button" style={{ marginTop: 8 }}>Save API Keys</button>
            {apiMessage && <div className="message success">{apiMessage}</div>}
          </form>
        </AccordionSection>

        <div className="form-actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
          
        </div>
      </form>
    </section>
  );
};

export default Popup;
