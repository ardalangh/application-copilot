import { browser } from "webextension-polyfill-ts";

// Helper method to check if job description is visible on current website
function JobDescriptionVisible(): boolean {
  const hostname = window.location.hostname;

  // Website-specific checks
  if (hostname.includes("ashbyhq.com")) {
    return checkAshbyJobDescription();
  }

  // Add more websites here as needed
  // if (hostname.includes('lever.co')) {
  //   return checkLeverJobDescription();
  // }

  return false;
}

// Check if job description is visible on Ashby
function checkAshbyJobDescription(): boolean {
  const jobOverview = document.querySelector(
    '[aria-labelledby="job-overview"]'
  );
  return jobOverview !== null;
}

// Extract job description from current page
function extractJobDescription(): string {
  const hostname = window.location.hostname;

  if (hostname.includes("ashbyhq.com")) {
    return extractAshbyJobDescription();
  }

  return "";
}

// Extract job description from Ashby page
function extractAshbyJobDescription(): string {
  const jobOverview = document.querySelector(
    '[aria-labelledby="job-overview"]'
  );
  if (!jobOverview) return "";

  // Extract text content from the job overview section
  const textContent = jobOverview.textContent || "";
  return textContent.trim();
}

// Clean URL by removing parameters
function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

// Get available API key (prioritize OpenAI, fallback to Anthropic)
async function getAvailableApiKey(): Promise<{
  provider: "openai" | "anthropic" | null;
  key: string;
}> {
  try {
    const result = await browser.storage.sync.get("apiKeys");
    const apiKeys = result.apiKeys || {};

    if (apiKeys.openai && apiKeys.openai.trim()) {
      return { provider: "openai", key: apiKeys.openai.trim() };
    }

    if (apiKeys.anthropic && apiKeys.anthropic.trim()) {
      return { provider: "anthropic", key: apiKeys.anthropic.trim() };
    }

    return { provider: null, key: "" };
  } catch {
    return { provider: null, key: "" };
  }
}

// Generate cover letter using OpenAI API
async function generateCoverLetterOpenAI(
  apiKey: string,
  jobDescription: string,
  userProfile: any
): Promise<string> {
  const prompt = createCoverLetterPrompt(jobDescription, userProfile);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional cover letter writer. Write compelling, personalized cover letters that highlight the candidate's relevant experience and skills for the specific job opportunity.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Generate cover letter using Anthropic API
async function generateCoverLetterAnthropic(
  apiKey: string,
  jobDescription: string,
  userProfile: any
): Promise<string> {
  const prompt = createCoverLetterPrompt(jobDescription, userProfile);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Create cover letter prompt
function createCoverLetterPrompt(
  jobDescription: string,
  userProfile: any
): string {
  const education =
    userProfile.education
      ?.map(
        (edu: any) =>
          `${edu.degreeType} in ${edu.degreeField} from ${edu.university}`
      )
      .join(", ") || "";

  const experience =
    userProfile.workExperience
      ?.map(
        (work: any) =>
          `${work.jobTitle} at ${work.companyName} (${work.startDate} - ${work.endDate})`
      )
      .join(", ") || "";

  return `Write a professional cover letter for the following job opportunity:

JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROFILE:
Name: ${userProfile.firstName} ${userProfile.lastName}
Education: ${education}
Work Experience: ${experience}
Skills: ${userProfile.skills || ""}
Projects: ${userProfile.projects || ""}

Instructions:
1. Write a compelling cover letter that highlights relevant experience and skills
2. Match the candidate's background to the job requirements
3. Use a professional but engaging tone
4. Keep it concise (3-4 paragraphs)
5. Include specific examples where possible
6. End with a strong closing statement

Please write the cover letter now:`;
}

// Main cover letter generation function
async function generateCoverLetter(): Promise<string> {
  try {
    // Get job description
    const jobDescription = extractJobDescription();
    if (!jobDescription) {
      throw new Error("No job description found on this page");
    }

    // Get user profile
    const result = await browser.storage.sync.get("userProfile");
    const userProfile = result.userProfile || {};

    if (!userProfile.firstName || !userProfile.lastName) {
      throw new Error("Please complete your profile first");
    }

    // Get API key
    const { provider, key } = await getAvailableApiKey();
    if (!provider || !key) {
      throw new Error("Please configure your API keys first");
    }

    // Generate cover letter
    let coverLetter: string;
    if (provider === "openai") {
      coverLetter = await generateCoverLetterOpenAI(
        key,
        jobDescription,
        userProfile
      );
    } else {
      coverLetter = await generateCoverLetterAnthropic(
        key,
        jobDescription,
        userProfile
      );
    }

    // Store cover letter with cleaned URL
    const cleanedUrl = cleanUrl(window.location.href);
    await storeCoverLetter(cleanedUrl, coverLetter);

    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error);
    throw error;
  }
}

// Store cover letter mapped to URL
async function storeCoverLetter(
  url: string,
  coverLetter: string
): Promise<void> {
  try {
    const result = await browser.storage.sync.get("coverLetters");
    const coverLetters = result.coverLetters || {};

    coverLetters[url] = {
      content: coverLetter,
      createdAt: new Date().toISOString(),
    };

    await browser.storage.sync.set({ coverLetters });
  } catch (error) {
    console.error("Error storing cover letter:", error);
  }
}

// Helper to extract pure JS from LLM output (removes markdown code blocks)
function extractPureJSFromLLMOutput(output: string): string {
  // Remove markdown code block markers and explanations
  // e.g. ```js ... ```
  const codeBlockMatch = output.match(/```(?:javascript|js)?([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Otherwise, return the output as-is
  return output.trim();
}

// Generate autofill script using LLM
async function generateAutofillScriptWithLLM(html: string): Promise<string> {
  // Get API key
  const { provider, key } = await getAvailableApiKey();
  if (!provider || !key) {
    throw new Error('Please configure your API keys first');
  }

  const prompt = `You are a browser automation expert. Given the following HTML of a job application page, generate a JavaScript snippet that fills in all visible form fields (text, email, textarea, select, radio, checkbox) with realistic dummy data. Do not submit the form or click any final submit buttons. Only fill the fields. Do NOT use document.addEventListener('DOMContentLoaded', ...) or any similar wrappers; assume the script runs immediately. Output only the JavaScript code, no explanations.\n\nHTML:\n${html}`;

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful coding assistant.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });
    if (!response.ok) throw new Error('OpenAI API error: ' + response.status);
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } else {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error('Anthropic API error: ' + response.status);
    const data = await response.json();
    return data.content[0].text.trim();
  }
}

// Floating button and sidebar logic for Hiair extension
function createHiairFloatingButton() {
  if (document.getElementById("hiair-floating-btn")) return;

  // Create floating button
  const btn = document.createElement("div");
  btn.id = "hiair-floating-btn";
  btn.style.cssText = `
    position: fixed;
    top: 32px;
    right: 32px;
    width: 56px;
    height: 56px;
    background: #000;
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
  const icon = document.createElement("img");
  icon.src = browser.runtime.getURL("assets/icons/favicon-128.png");
  icon.alt = "Hiair";
  icon.style.cssText = "width: 32px; height: 32px; pointer-events: none;";
  btn.appendChild(icon);

  // X button (hidden by default)
  const closeBtn = document.createElement("div");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    position: absolute;
    top: -12px;
    left: -12px;
    width: 28px;
    height: 28px;
    background: #000;
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
  btn.addEventListener("mouseenter", () => {
    closeBtn.style.opacity = "1";
    closeBtn.style.pointerEvents = "auto";
  });
  btn.addEventListener("mouseleave", () => {
    closeBtn.style.opacity = "0";
    closeBtn.style.pointerEvents = "none";
  });

  // Hide button on X click
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    btn.remove();
  });

  // Show sidebar on button click
  btn.addEventListener("click", (e) => {
    // Prevent drag from triggering sidebar
    if ((e as any)._dragging) return;
    btn.style.display = "none";
    createHiairSidebar(() => {
      btn.style.display = "flex";
    });
  });

  // --- Drag logic for Y axis on right side ---
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  btn.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    startY = e.clientY;
    startTop = btn.offsetTop;
    btn.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    let newTop = startTop + deltaY;
    // Clamp to viewport
    const minTop = 0;
    const maxTop = window.innerHeight - btn.offsetHeight;
    newTop = Math.max(minTop, Math.min(maxTop, newTop));
    btn.style.top = newTop + "px";
    btn.style.right = "32px"; // Always snap to right
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      btn.style.cursor = "grab";
      document.body.style.userSelect = "";
    }
  });

  document.body.appendChild(btn);
}

function createHiairSidebar(onClose: (() => void) | undefined) {
  if (document.getElementById("hiair-sidebar")) return;

  // Font loading logic (same as before)
  let fontUrl = browser.runtime.getURL("/assets/fonts/Archicoco/Archicoco.otf");

  const fontFace = new FontFace(
    "Archicoco",
    `url('${fontUrl}') format('opentype')`
  );

  fontFace
    .load()
    .then(function (loadedFace) {
      document.fonts.add(loadedFace);
      injectSidebar();
    })
    .catch(function () {
      injectSidebar();
    });

  function injectSidebar() {
    if (document.getElementById("hiair-sidebar")) return;
    const sidebar = document.createElement("div");
    sidebar.id = "hiair-sidebar";
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

    // Generate autofill content based on job description visibility
    async function getAutofillContent(): Promise<string> {
      const isJobDescVisible = JobDescriptionVisible();

      // Check if there's a stored cover letter for this URL
      let storedCoverLetter = "";
      try {
        const cleanedUrl = cleanUrl(window.location.href);
        const result = await browser.storage.sync.get("coverLetters");
        const coverLetters = result.coverLetters || {};
        if (coverLetters[cleanedUrl]) {
          storedCoverLetter = coverLetters[cleanedUrl].content;
        }
      } catch (error) {
        console.error("Error fetching stored cover letter:", error);
      }

      return `
        
        <div style="margin: 0 18px 18px 18px; background: #fafbfc; border-radius: 8px; padding: 0;">
          <div style="display: flex; align-items: center; padding: 14px 0 14px 0; border-bottom: 1px solid #ececec;">
            <span style="background: #f3e8ff; color: #b39ddb; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 12px 0 12px; font-size: 18px;">📄</span>
            <span style="flex:1;">Resume</span>
            <span style="color: #00b6e6; font-weight: 500; cursor: pointer; margin-right: 16px;">Preview</span>
          </div>
          <div style="display: flex; align-items: center; padding: 14px 0 14px 0; border-bottom: 1px solid #ececec;">
            <span style="background: #ffe0e0; color: #e57373; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 12px 0 12px; font-size: 18px;">✏️</span>
            <span style="flex:1;">Cover Letter</span>
            ${
              isJobDescVisible
                ? '<button id="generate-cover-letter-btn" style="background: #e6f7fa; color: #00b6e6; border: none; border-radius: 4px; padding: 4px 12px; font-weight: 600; cursor: pointer; margin-right: 8px; font-size: 14px;">Generate</button>'
                : '<span style="color: #bdbdbd; margin-right: 16px;">No Job Description Found</span>'
            }
          </div>
          <div id="cover-letter-accordion" style="display: ${storedCoverLetter ? "block" : "none"}; padding: 16px; background: #f9fafb; border-radius: 8px; margin: 12px 16px 0 16px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #222;">Generated Cover Letter</h4>
              <button id="close-cover-letter" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #bdbdbd; padding: 0; line-height: 1;">×</button>
            </div>
            <div id="cover-letter-content" style="white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #444; max-height: 300px; overflow-y: auto; padding: 12px; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;">${storedCoverLetter}</div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button id="copy-cover-letter" style="background: #e6f7fa; color: #00b6e6; border: none; border-radius: 4px; padding: 6px 12px; font-weight: 600; cursor: pointer; font-size: 12px;">Copy</button>
              <button id="download-cover-letter" style="background: #f0f0f0; color: #666; border: none; border-radius: 4px; padding: 6px 12px; font-weight: 600; cursor: pointer; font-size: 12px;">Download</button>
            </div>
            
          </div>
          <div style="background: #00b6e6; color: #fff; border-radius: 10px; margin: 18px 0; padding: 20px 20px; display: flex; flex-direction: column; align-items: stretch; width: 100%; box-sizing: border-box;">      
            <button style="width: 100%; background: #fff; color: #00b6e6; border: none; border-radius: 8px; padding: 14px 0; font-weight: 700; font-size: 17px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,182,230,0.10); transition: background 0.2s, color 0.2s; letter-spacing: 0.5px;">⚡ Autofill</button>
          </div>
        </div>
      `;
    }

    // Show cover letter in accordion
    function showCoverLetterAccordion(coverLetter: string): void {
      const accordion = document.getElementById("cover-letter-accordion");
      const content = document.getElementById("cover-letter-content");

      if (accordion && content) {
        content.textContent = coverLetter;
        accordion.style.display = "block";

        // Setup accordion listeners
        setupCoverLetterAccordionListeners();
      }
    }

    // Setup cover letter accordion listeners
    function setupCoverLetterAccordionListeners(): void {
      const accordion = document.getElementById("cover-letter-accordion");
      const content = document.getElementById("cover-letter-content");

      if (!accordion || !content) return;

      const currentCoverLetter = content.textContent || "";

      // Setup close button
      const closeBtn = document.getElementById("close-cover-letter");
      if (closeBtn) {
        closeBtn.replaceWith(closeBtn.cloneNode(true)); // Remove previous listeners
        const newCloseBtn = document.getElementById("close-cover-letter");
        if (newCloseBtn) {
          newCloseBtn.addEventListener("click", () => {
            accordion.style.display = "none";
          });
        }
      }

      // Setup copy button
      const copyBtn = document.getElementById("copy-cover-letter");
      if (copyBtn) {
        copyBtn.replaceWith(copyBtn.cloneNode(true)); // Remove previous listeners
        const newCopyBtn = document.getElementById("copy-cover-letter");
        if (newCopyBtn) {
          newCopyBtn.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(currentCoverLetter);
              const originalText = newCopyBtn.textContent;
              newCopyBtn.textContent = "Copied!";
              newCopyBtn.style.background = "#e8f5e8";
              newCopyBtn.style.color = "#4caf50";
              setTimeout(() => {
                newCopyBtn.textContent = originalText;
                newCopyBtn.style.background = "#e6f7fa";
                newCopyBtn.style.color = "#00b6e6";
              }, 2000);
            } catch (error) {
              console.error("Failed to copy:", error);
            }
          });
        }
      }

      // Setup download button
      const downloadBtn = document.getElementById("download-cover-letter");
      if (downloadBtn) {
        downloadBtn.replaceWith(downloadBtn.cloneNode(true)); // Remove previous listeners
        const newDownloadBtn = document.getElementById("download-cover-letter");
        if (newDownloadBtn) {
          newDownloadBtn.addEventListener("click", () => {
            const blob = new Blob([currentCoverLetter], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "cover-letter.txt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });
        }
      }
    }


    // Setup autofill button event listener
    function setupAutofillButtonListener(): void {
      // Scope to the sidebar content only!
      const contentDiv = document.getElementById('hiair-sidebar-content');
      if (!contentDiv) return;
      const autofillBtn = Array.from(contentDiv.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('⚡ Autofill') || btn.textContent?.includes('Autofill')
      );
      if (autofillBtn) {
        autofillBtn.addEventListener('click', async () => {
          // Add loading indicator
          const originalText = autofillBtn.textContent;
          autofillBtn.textContent = 'Generating...';
          autofillBtn.disabled = true;
          autofillBtn.style.background = '#f0f0f0';
          autofillBtn.style.color = '#999';
          // Optionally, add a spinner
          // autofillBtn.innerHTML = '<span class="spinner"></span> Generating...';
          try {
            const html = document.body.innerHTML;
            const script = await generateAutofillScriptWithLLM(html);
            console.log(script);
            try {
              const pureScript = extractPureJSFromLLMOutput(script);
              // eslint-disable-next-line no-eval
              eval(pureScript);
            } catch (e) {
              console.error('Error executing autofill script:', e);
            }
            autofillBtn.textContent = 'Generated!';
            autofillBtn.style.background = '#e6f7fa';
            autofillBtn.style.color = '#00b6e6';
            setTimeout(() => {
              autofillBtn.textContent = originalText;
              autofillBtn.disabled = false;
              autofillBtn.style.background = '#e6f7fa';
              autofillBtn.style.color = '#00b6e6';
            }, 2000);
          } catch (err) {
            autofillBtn.textContent = 'Error';
            autofillBtn.style.background = '#ffe0e0';
            autofillBtn.style.color = '#e57373';
            console.error('Error generating autofill script:', err);
            setTimeout(() => {
              autofillBtn.textContent = originalText;
              autofillBtn.disabled = false;
              autofillBtn.style.background = '#e6f7fa';
              autofillBtn.style.color = '#00b6e6';
            }, 3000);
          }
        });
      }
    }

    // Setup generate cover letter button event listener
    function setupGenerateButtonListener(): void {
      const generateBtn = document.getElementById("generate-cover-letter-btn");
      if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
          const button = generateBtn as HTMLButtonElement;
          const originalText = button.textContent;

          try {
            // Show loading state
            button.textContent = "Generating...";
            button.disabled = true;
            button.style.background = "#f0f0f0";
            button.style.color = "#999";

            // Generate cover letter
            const coverLetter = await generateCoverLetter();

            // Show success state
            button.textContent = "Generated!";
            button.style.background = "#e6f7fa";
            button.style.color = "#00b6e6";

            // Show cover letter in accordion
            showCoverLetterAccordion(coverLetter);

            // Reset button after 2 seconds
            setTimeout(() => {
              button.textContent = originalText;
              button.disabled = false;
              button.style.background = "#e6f7fa";
              button.style.color = "#00b6e6";
            }, 2000);
          } catch (error) {
            // Show error state
            button.textContent = "Error";
            button.style.background = "#ffe0e0";
            button.style.color = "#e57373";

            alert("Error generating cover letter: " + (error as Error).message);

            // Reset button after 3 seconds
            setTimeout(() => {
              button.textContent = originalText;
              button.disabled = false;
              button.style.background = "#e6f7fa";
              button.style.color = "#00b6e6";
            }, 3000);
          }
        });
      }
    }

    function getProfileFormHTML(profile: any, message: string): string {
      // Helper to render education entries
      function renderEducation(education: any[]) {
        return education
          .map(
            (edu: any, idx: number) => `
          <div class="dynamic-entry" data-id="${edu.id}">
            ${education.length > 1 ? `<button type="button" class="remove-edu-btn" style="float:right; color:#e57373; background:none; border:none; font-size:18px; cursor:pointer;">×</button>` : ""}
            <div class="dynamic-heading">Education ${idx + 1}</div>
            <label>University/Institution<br/>
              <input name="university-${edu.id}" type="text" value="${edu.university || ""}" />
            </label>
            <label>Degree Type<br/>
              <select name="degreeType-${edu.id}">
                <option value="">Select degree type</option>
                <option value="Associate"${edu.degreeType === "Associate" ? " selected" : ""}>Associate</option>
                <option value="Bachelor"${edu.degreeType === "Bachelor" ? " selected" : ""}>Bachelor</option>
                <option value="Master"${edu.degreeType === "Master" ? " selected" : ""}>Master</option>
                <option value="PhD"${edu.degreeType === "PhD" ? " selected" : ""}>PhD</option>
                <option value="Other"${edu.degreeType === "Other" ? " selected" : ""}>Other</option>
              </select>
            </label>
            <label>Field of Study<br/>
              <input name="degreeField-${edu.id}" type="text" value="${edu.degreeField || ""}" />
            </label>
            <div class="row-fields">
              <label>Start Date<br/>
                <input name="startDate-${edu.id}" type="date" value="${edu.startDate || ""}" />
              </label>
              <label>End Date<br/>
                <input name="endDate-${edu.id}" type="date" value="${edu.endDate || ""}" />
              </label>
            </div>
          </div>
        `
          )
          .join("");
      }
      // Helper to render work experience entries
      function renderWork(workExperience: any[]) {
        return workExperience
          .map(
            (work: any, idx: number) => `
          <div class="dynamic-entry" data-id="${work.id}">
            ${workExperience.length > 1 ? `<button type="button" class="remove-work-btn" style="float:right; color:#e57373; background:none; border:none; font-size:18px; cursor:pointer;">×</button>` : ""}
            <div class="dynamic-heading">Experience ${idx + 1}</div>
            <label>Job Title<br/>
              <input name="jobTitle-${work.id}" type="text" value="${work.jobTitle || ""}" />
            </label>
            <label>Company Name<br/>
              <input name="companyName-${work.id}" type="text" value="${work.companyName || ""}" />
            </label>
            <div class="row-fields">
              <label>Start Date<br/>
                <input name="workStartDate-${work.id}" type="date" value="${work.startDate || ""}" />
              </label>
              <label>End Date<br/>
                <input name="workEndDate-${work.id}" type="date" value="${work.endDate || ""}" />
              </label>
            </div>
            <label>Work Location<br/>
              <select name="workLocation-${work.id}">
                <option value="">Select work location</option>
                <option value="Remote"${work.workLocation === "Remote" ? " selected" : ""}>Remote</option>
                <option value="On-site"${work.workLocation === "On-site" ? " selected" : ""}>On-site</option>
                <option value="Hybrid"${work.workLocation === "Hybrid" ? " selected" : ""}>Hybrid</option>
              </select>
            </label>
            <label>Job Description/Bullet Points<br/>
              <textarea name="jobDescription-${work.id}" rows="2">${work.jobDescription || ""}</textarea>
            </label>
          </div>
        `
          )
          .join("");
      }
      // Accordion content for each section
      const sections = [
        {
          title: "Personal Information",
          content: `
            <div class="profile-names-row">
              <label>First Name*<br/><input name="firstName" type="text" value="${profile.firstName || ""}" required /></label>
              <label>Last Name*<br/><input name="lastName" type="text" value="${profile.lastName || ""}" required /></label>
            </div>
            <label>Phone number<br/><input name="phone" type="text" value="${profile.phone || ""}" style="width:100%;padding:6px;" /></label>
            <label>Portfolio<br/><input name="portfolio" type="url" value="${profile.portfolio || ""}" style="width:100%;padding:6px;" /></label>
            <label>LinkedIn URL<br/><input name="linkedInUrl" type="url" value="${profile.linkedInUrl || ""}" style="width:100%;padding:6px;" /></label>
            <label>GitHub URL<br/><input name="githubUrl" type="url" value="${profile.githubUrl || ""}" style="width:100%;padding:6px;" /></label>
            <label>Other URL<br/><input name="otherUrl" type="url" value="${profile.otherUrl || ""}" style="width:100%;padding:6px;" /></label>
          `,
        },
        {
          title: "Resume",
          content: `
            <label>Upload Resume (PDF only)<br/>
              <input name="resume" type="file" accept="application/pdf" style="margin-top:8px;" />
            </label>
            ${profile.resumeUploadDate ? `<div style='font-size:13px;color:#888;margin-bottom:8px;'>Uploaded: ${profile.resumeUploadDate}</div>` : ""}
            ${profile.resume ? `<div style='font-size:13px;color:#00b6e6;margin-bottom:8px;'>PDF file stored.</div>` : ""}
          `,
        },
        {
          title: "Education",
          content: `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;">Education</span>
              <button type="button" id="add-edu-btn" style="background:#e6f7fa;color:#00b6e6;border:none;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;">+</button>
            </div>
            <div id="education-list">${renderEducation(profile.education)}</div>
          `,
        },
        {
          title: "Work Experience",
          content: `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;">Work Experience</span>
              <button type="button" id="add-work-btn" style="background:#e6f7fa;color:#00b6e6;border:none;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;">+</button>
            </div>
            <div id="work-list">${renderWork(profile.workExperience)}</div>
          `,
        },
        {
          title: "Projects",
          content: `<label>Projects<br/><textarea name="projects" rows="2" style="width:100%;padding:6px;">${profile.projects || ""}</textarea></label>`,
        },
        {
          title: "Skills",
          content: `<label>Skills<br/><textarea name="skills" rows="2" style="width:100%;padding:6px;">${profile.skills || ""}</textarea></label>`,
        },
        {
          title: "Other/Personal Details",
          content: `
            <label>Gender<br/><select name="gender" style="width:100%;padding:6px;">
              <option value="">Select gender</option>
              <option value="Male"${profile.gender === "Male" ? " selected" : ""}>Male</option>
              <option value="Female"${profile.gender === "Female" ? " selected" : ""}>Female</option>
              <option value="Non-binary"${profile.gender === "Non-binary" ? " selected" : ""}>Non-binary</option>
              <option value="Prefer not to say"${profile.gender === "Prefer not to say" ? " selected" : ""}>Prefer not to say</option>
            </select></label>
            <label>Orientation<br/><input name="orientation" type="text" value="${profile.orientation || ""}" style="width:100%;padding:6px;" /></label>
            <label>Race/Ethnicity<br/><input name="race" type="text" value="${profile.race || ""}" style="width:100%;padding:6px;" /></label>
            <label>Relocation Willingness<br/><select name="relocationWillingness" style="width:100%;padding:6px;">
              <option value="">Select willingness</option>
              <option value="Yes"${profile.relocationWillingness === "Yes" ? " selected" : ""}>Yes</option>
              <option value="No"${profile.relocationWillingness === "No" ? " selected" : ""}>No</option>
              <option value="Maybe"${profile.relocationWillingness === "Maybe" ? " selected" : ""}>Maybe</option>
            </select></label>
            <label>Commute Willingness<br/><input name="commuteWillingness" type="text" value="${profile.commuteWillingness || ""}" style="width:100%;padding:6px;" /></label>
            <label>Veteran Status<br/><select name="veteranStatus" style="width:100%;padding:6px;">
              <option value="">Select status</option>
              <option value="Yes"${profile.veteranStatus === "Yes" ? " selected" : ""}>Yes</option>
              <option value="No"${profile.veteranStatus === "No" ? " selected" : ""}>No</option>
              <option value="Prefer not to say"${profile.veteranStatus === "Prefer not to say" ? " selected" : ""}>Prefer not to say</option>
            </select></label>
            <label>Disability Status<br/><select name="disabilityStatus" style="width:100%;padding:6px;">
              <option value="">Select status</option>
              <option value="Yes"${profile.disabilityStatus === "Yes" ? " selected" : ""}>Yes</option>
              <option value="No"${profile.disabilityStatus === "No" ? " selected" : ""}>No</option>
              <option value="Prefer not to say"${profile.disabilityStatus === "Prefer not to say" ? " selected" : ""}>Prefer not to say</option>
            </select></label>
            <label>Expected Salary<br/><input name="expectedSalary" type="text" value="${profile.expectedSalary || ""}" style="width:100%;padding:6px;" /></label>
            <label>Sponsorship Requirements<br/><select name="sponsorshipRequirements" style="width:100%;padding:6px;">
              <option value="">Select requirement</option>
              <option value="Yes"${profile.sponsorshipRequirements === "Yes" ? " selected" : ""}>Yes</option>
              <option value="No"${profile.sponsorshipRequirements === "No" ? " selected" : ""}>No</option>
              <option value="In the future"${profile.sponsorshipRequirements === "In the future" ? " selected" : ""}>In the future</option>
            </select></label>
          `,
        },
      ];
      // Compose the form with sections (no accordion)
      return `
        <form id=\"hiair-profile-form\" style=\"background: #fafbfc; border-radius: 14px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); padding: 0 0 0 0; display: flex; flex-direction: column; height: 100%; min-height: 0; max-width: 420px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;\">
          <div style=\"margin: 24px 32px 0 32px; display: flex; flex-direction: column; align-items: flex-start; width: auto;\">
            ${message ? `<div style='color: #00b6e6; font-size: 14px; margin-top: 12px; margin-bottom: 18px; font-weight: 500; background: #f6fcff; border-radius: 4px; padding: 6px 14px; display: block; width: auto;'>${message}</div>` : ""}
          </div>
          <div id=\"hiair-profile-content\" style=\"flex: 1 1 0; overflow-y: auto; min-height: 0; padding: 0 32px 0 32px;\">
            ${sections
              .map(
                (s) => `
              <div style='margin-top: 36px;'>
                <div style='font-size: 18px; font-weight: 700; margin-bottom: 18px; color: #222; letter-spacing: -0.2px;'>${s.title}</div>
                <div style='display: flex; flex-direction: column; gap: 18px;'>
                  ${s.content.replace(/<label/g, "<label style='font-size: 14px; font-weight: 500; color: #444; margin-bottom: 4px; display: flex; flex-direction: column; gap: 6px;'")}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <div style=\"padding: 20px 32px 24px 32px; background: #fff; box-shadow: 0 -2px 12px rgba(0,0,0,0.08); border-radius: 0 0 14px 14px;\">
            <button type=\"submit\" style=\"width: 100%; background: #00b6e6; color: #fff; border: none; border-radius: 8px; padding: 14px 0; font-weight: 700; font-size: 17px; cursor: pointer; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(0,182,230,0.08); transition: background 0.2s;\">Save Profile</button>
          </div>
        </form>\n      `;
    }

    // Setup education event listeners
    function setupEducationEventListeners(): void {
      // Add education entry button
      const addEduBtn = document.getElementById("add-edu-btn");
      if (addEduBtn) {
        addEduBtn.addEventListener("click", (e) => {
          e.preventDefault();
          addNewEducationEntry();
        });
      }

      // Remove education entry buttons
      const removeEduBtns = document.querySelectorAll(".remove-edu-btn");
      removeEduBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const entry = (e.target as HTMLElement).closest(".dynamic-entry");
          if (entry) {
            entry.remove();
            updateEducationNumbers();
          }
        });
      });

      // Add work experience entry button
      const addWorkBtn = document.getElementById("add-work-btn");
      if (addWorkBtn) {
        addWorkBtn.addEventListener("click", (e) => {
          e.preventDefault();
          addNewWorkEntry();
        });
      }

      // Remove work experience entry buttons
      const removeWorkBtns = document.querySelectorAll(".remove-work-btn");
      removeWorkBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const entry = (e.target as HTMLElement).closest(".dynamic-entry");
          if (entry) {
            entry.remove();
            updateWorkNumbers();
          }
        });
      });
    }

    // Add new education entry
    function addNewEducationEntry(): void {
      const educationList = document.getElementById("education-list");
      if (!educationList) return;

      const newId = Date.now().toString();
      const newEntry = document.createElement("div");
      newEntry.className = "dynamic-entry";
      newEntry.setAttribute("data-id", newId);

      const currentCount =
        educationList.querySelectorAll(".dynamic-entry").length;
      newEntry.innerHTML = `
        <button type="button" class="remove-edu-btn" style="color:#e57373; background:none; border:none; cursor:pointer;">×</button>
        <div class="dynamic-heading">Education ${currentCount + 1}</div>
        <label>University/Institution
          <input name="university-${newId}" type="text" value="" />
        </label>
        <label>Degree Type
          <select name="degreeType-${newId}">
            <option value="">Select degree type</option>
            <option value="Associate">Associate</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Master">Master</option>
            <option value="PhD">PhD</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>Field of Study
          <input name="degreeField-${newId}" type="text" value="" />
        </label>
        <div class="row-fields">
          <label>Start Date
            <input name="startDate-${newId}" type="date" value="" />
          </label>
          <label>End Date
            <input name="endDate-${newId}" type="date" value="" />
          </label>
        </div>
      `;

      educationList.appendChild(newEntry);

      // Add event listener to the new remove button
      const removeBtn = newEntry.querySelector(".remove-edu-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          newEntry.remove();
          updateEducationNumbers();
        });
      }
    }

    // Update education entry numbers
    function updateEducationNumbers(): void {
      const educationList = document.getElementById("education-list");
      if (!educationList) return;

      const entries = educationList.querySelectorAll(".dynamic-entry");
      entries.forEach((entry, index) => {
        const heading = entry.querySelector(".dynamic-heading");
        if (heading) {
          heading.textContent = `Education ${index + 1}`;
        }
      });
    }

    // Add new work experience entry
    function addNewWorkEntry(): void {
      const workList = document.getElementById("work-list");
      if (!workList) return;

      const newId = Date.now().toString();
      const newEntry = document.createElement("div");
      newEntry.className = "dynamic-entry";
      newEntry.setAttribute("data-id", newId);

      const currentCount = workList.querySelectorAll(".dynamic-entry").length;
      newEntry.innerHTML = `
        <button type="button" class="remove-work-btn" style="color:#e57373; background:none; border:none; cursor:pointer;">×</button>
        <div class="dynamic-heading">Experience ${currentCount + 1}</div>
        <label>Job Title
          <input name="jobTitle-${newId}" type="text" value="" />
        </label>
        <label>Company Name
          <input name="companyName-${newId}" type="text" value="" />
        </label>
        <div class="row-fields">
          <label>Start Date
            <input name="workStartDate-${newId}" type="date" value="" />
          </label>
          <label>End Date
            <input name="workEndDate-${newId}" type="date" value="" />
          </label>
        </div>
        <label>Work Location
          <select name="workLocation-${newId}">
            <option value="">Select work location</option>
            <option value="Remote">Remote</option>
            <option value="On-site">On-site</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </label>
        <label>Job Description/Bullet Points
          <textarea name="jobDescription-${newId}" rows="2"></textarea>
        </label>
      `;

      workList.appendChild(newEntry);

      // Add event listener to the new remove button
      const removeBtn = newEntry.querySelector(".remove-work-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          newEntry.remove();
          updateWorkNumbers();
        });
      }
    }

    // Update work experience entry numbers
    function updateWorkNumbers(): void {
      const workList = document.getElementById("work-list");
      if (!workList) return;

      const entries = workList.querySelectorAll(".dynamic-entry");
      entries.forEach((entry, index) => {
        const heading = entry.querySelector(".dynamic-heading");
        if (heading) {
          heading.textContent = `Experience ${index + 1}`;
        }
      });
    }

    // Setup profile form submission handler
    function setupProfileFormSubmission(): void {
      const form = document.getElementById("hiair-profile-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();

          const formData = new FormData(form as HTMLFormElement);
          const profile: any = {
            firstName: formData.get("firstName") || "",
            lastName: formData.get("lastName") || "",
            phone: formData.get("phone") || "",
            portfolio: formData.get("portfolio") || "",
            linkedInUrl: formData.get("linkedInUrl") || "",
            githubUrl: formData.get("githubUrl") || "",
            otherUrl: formData.get("otherUrl") || "",
            projects: formData.get("projects") || "",
            skills: formData.get("skills") || "",
            gender: formData.get("gender") || "",
            orientation: formData.get("orientation") || "",
            race: formData.get("race") || "",
            relocationWillingness: formData.get("relocationWillingness") || "",
            commuteWillingness: formData.get("commuteWillingness") || "",
            veteranStatus: formData.get("veteranStatus") || "",
            disabilityStatus: formData.get("disabilityStatus") || "",
            expectedSalary: formData.get("expectedSalary") || "",
            sponsorshipRequirements:
              formData.get("sponsorshipRequirements") || "",
            education: [],
            workExperience: [],
          };

          // Collect education entries
          const educationEntries = document.querySelectorAll(
            "#education-list .dynamic-entry"
          );
          educationEntries.forEach((entry) => {
            const id = entry.getAttribute("data-id") || "";
            const educationEntry = {
              id: id,
              university: formData.get(`university-${id}`) || "",
              degreeType: formData.get(`degreeType-${id}`) || "",
              degreeField: formData.get(`degreeField-${id}`) || "",
              startDate: formData.get(`startDate-${id}`) || "",
              endDate: formData.get(`endDate-${id}`) || "",
            };
            profile.education.push(educationEntry);
          });

          // Collect work experience entries
          const workEntries = document.querySelectorAll(
            "#work-list .dynamic-entry"
          );
          workEntries.forEach((entry) => {
            const id = entry.getAttribute("data-id") || "";
            const workEntry = {
              id: id,
              jobTitle: formData.get(`jobTitle-${id}`) || "",
              companyName: formData.get(`companyName-${id}`) || "",
              startDate: formData.get(`workStartDate-${id}`) || "",
              endDate: formData.get(`workEndDate-${id}`) || "",
              workLocation: formData.get(`workLocation-${id}`) || "",
              jobDescription: formData.get(`jobDescription-${id}`) || "",
            };
            profile.workExperience.push(workEntry);
          });

          // Handle resume file upload
          const resumeFile = formData.get("resume") as File;
          if (resumeFile && resumeFile.size > 0) {
            try {
              const reader = new FileReader();
              reader.onload = async (e) => {
                profile.resume = e.target?.result as string;
                profile.resumeUploadDate = new Date().toLocaleDateString();
                await saveProfileData(profile);
              };
              reader.readAsDataURL(resumeFile);
            } catch (error) {
              await saveProfileData(profile);
            }
          } else {
            await saveProfileData(profile);
          }
        });
      }
    }

    // Save profile data to storage
    async function saveProfileData(profile: any): Promise<void> {
      try {
        await browser.storage.sync.set({ userProfile: profile });
        renderProfileTab("Profile saved successfully!");
      } catch (error) {
        renderProfileTab("Error saving profile. Please try again.");
      }
    }

    // Profile tab logic
    async function renderProfileTab(message: string = ""): Promise<void> {
      // Default profile structure
      let profile: any = {
        firstName: "",
        lastName: "",
        phone: "",
        portfolio: "",
        linkedInUrl: "",
        githubUrl: "",
        otherUrl: "",
        resume: "",
        resumeUploadDate: "",
        education: [
          {
            id: "1",
            university: "",
            degreeType: "",
            degreeField: "",
            startDate: "",
            endDate: "",
          },
        ],
        workExperience: [
          {
            id: "1",
            jobTitle: "",
            companyName: "",
            startDate: "",
            endDate: "",
            workLocation: "",
            jobDescription: "",
          },
        ],
        projects: "",
        skills: "",
        gender: "",
        orientation: "",
        race: "",
        relocationWillingness: "",
        commuteWillingness: "",
        veteranStatus: "",
        disabilityStatus: "",
        expectedSalary: "",
        sponsorshipRequirements: "",
      };
      try {
        const result = await browser.storage.sync.get("userProfile");
        if (result.userProfile) {
          profile = { ...profile, ...result.userProfile };
          // Migrate old 'name' field if present
          if (!profile.firstName && !profile.lastName && profile.name) {
            const parts = profile.name.split(" ");
            profile.firstName = parts[0] || "";
            profile.lastName = parts.slice(1).join(" ") || "";
          }
          // Ensure arrays are present
          if (
            !Array.isArray(profile.education) ||
            profile.education.length === 0
          )
            profile.education = [
              {
                id: "1",
                university: "",
                degreeType: "",
                degreeField: "",
                startDate: "",
                endDate: "",
              },
            ];
          if (
            !Array.isArray(profile.workExperience) ||
            profile.workExperience.length === 0
          )
            profile.workExperience = [
              {
                id: "1",
                jobTitle: "",
                companyName: "",
                startDate: "",
                endDate: "",
                workLocation: "",
                jobDescription: "",
              },
            ];
        }
      } catch {}
      if (contentDiv)
        contentDiv.innerHTML = getProfileFormHTML(profile, message);

      // Add event listeners for dynamic education functionality
      setupEducationEventListeners();

      // Add profile form submission handler
      setupProfileFormSubmission();

      // Ensure scroll/height styles for profile tab (in case of direct render)
      if (contentDiv && sidebar) {
        (sidebar as HTMLElement).style.height = "calc(100vh - 40px)"; // 20px top + 20px bottom
        (sidebar as HTMLElement).style.maxHeight = "calc(100vh - 40px)";
        (contentDiv as HTMLElement).style.height = "calc(100vh - 40px - 70px)"; // 40px margin, 70px header/tabs
        (contentDiv as HTMLElement).style.overflowY = "auto";
      }
    }

    // API Keys tab logic
    async function renderApiKeysTab(message = "") {
      let apiKeys = { openai: "", anthropic: "" };
      try {
        const result = await browser.storage.sync.get("apiKeys");
        if (result.apiKeys) apiKeys = result.apiKeys;
      } catch {}
      const openaiLogo = browser.runtime.getURL("assets/icons/openailogo.png");
      const anthropicLogo = browser.runtime.getURL(
        "assets/icons/anthropiclogo.png"
      );
      if (contentDiv)
        contentDiv.innerHTML = `
        <form id="hiair-apikeys-form" style="padding: 18px; display: flex; flex-direction: column; gap: 24px;">
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">API Keys</div>
          ${message ? `<div style='color: #00b6e6; font-size: 14px; margin-bottom: 8px;'>${message}</div>` : ""}
          <label style="font-size: 14px; font-weight: 500; color: #222;">
            <span style="margin-bottom: 8px; display: block;">OpenAI API Key</span>
            <div class="apikey-input-row">
              <img src="${openaiLogo}" alt="OpenAI Logo" class="apikey-logo" />
              <input name="openai" type="text" value="${apiKeys.openai || ""}" style="width: 100%;" />
            </div>
          </label>
          <label style="font-size: 14px; font-weight: 500; color: #222;">
            <span style="margin-bottom: 8px; display: block;">Anthropic API Key</span>
            <div class="apikey-input-row">
              <img src="${anthropicLogo}" alt="Anthropic Logo" class="apikey-logo" />
              <input name="anthropic" type="text" value="${apiKeys.anthropic || ""}" style="width: 100%;" />
            </div>
          </label>
          <button type="submit" style="background: #00b6e6; color: #fff; border: none; border-radius: 6px; padding: 10px 0; font-weight: 600; font-size: 15px; cursor: pointer; margin-top: 8px;">Save API Keys</button>
        </form>
      `;
      const form = contentDiv?.querySelector("#hiair-apikeys-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(form as HTMLFormElement);
          const updatedKeys = {
            openai: formData.get("openai") || "",
            anthropic: formData.get("anthropic") || "",
          };
          try {
            await browser.storage.sync.set({ apiKeys: updatedKeys });
            renderApiKeysTab("API keys saved!");
          } catch {
            renderApiKeysTab("Error saving API keys.");
          }
        });
      }
      // Inject API key input row CSS if not present
      const apikeyStyleId = "hiair-apikeys-style";
      if (!document.getElementById(apikeyStyleId)) {
        const style = document.createElement("style");
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

    // Inject modern input styles for the profile form if not present
    const modernInputStyleId = "hiair-profile-modern-input-style";
    if (!document.getElementById(modernInputStyleId)) {
      const style = document.createElement("style");
      style.id = modernInputStyleId;
      style.textContent = `
        #hiair-profile-form input,
        #hiair-profile-form select,
        #hiair-profile-form textarea {
          border-radius: 8px !important;
          border: 1.5px solid #bdbdbd !important;
          background: #fff !important;
          color: #222 !important;
          font-size: 15px !important;
          padding: 10px 12px !important;
          margin-top: 4px !important;
          box-shadow: none !important;
          appearance: none !important;
          outline: none !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        #hiair-profile-form input:focus,
        #hiair-profile-form select:focus,
        #hiair-profile-form textarea:focus {
          border-color: #00b6e6 !important;
          box-shadow: 0 0 0 2px #00b6e633 !important;
        }
        .dynamic-entry {
          margin-bottom: 24px !important;
          padding: 16px !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          background: #f9fafb !important;
          position: relative !important;
        }
        .dynamic-entry label {
          display: flex !important;
          flex-direction: column !important;
          gap: 6px !important;
          margin-bottom: 12px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #444 !important;
        }
        .dynamic-heading {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #222 !important;
          margin-bottom: 12px !important;
        }
        .row-fields {
          display: flex !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
        }
        .row-fields label {
          flex: 1 !important;
          margin-bottom: 0 !important;
          min-width: 0 !important;
        }
        .row-fields input {
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .remove-edu-btn, .remove-work-btn {
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 16px !important;
          line-height: 1 !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Set initial content
    const contentDiv = sidebar.querySelector("#hiair-sidebar-content");
    if (contentDiv) {
      getAutofillContent().then((content) => {
        contentDiv.innerHTML = content;
        // Setup generate button listener for initial load
        setTimeout(() => {
          setupGenerateButtonListener();
          setupCoverLetterAccordionListeners();
          setupAutofillButtonListener();
        }, 0);
      });
      // Apply full height styles for initial autofill tab
      setTimeout(() => {
        (sidebar as HTMLElement).style.height = "calc(100vh - 40px)";
        (sidebar as HTMLElement).style.maxHeight = "calc(100vh - 40px)";
        (contentDiv as HTMLElement).style.height = "calc(100vh - 40px - 70px)";
        (contentDiv as HTMLElement).style.overflowY = "hidden";
      }, 0);
    }

    // Tab switching logic
    const autofillTab = sidebar.querySelector(
      "#hiair-tab-autofill"
    ) as HTMLButtonElement;
    const profileTab = sidebar.querySelector(
      "#hiair-tab-profile"
    ) as HTMLButtonElement;
    const apiKeysTab = sidebar.querySelector(
      "#hiair-tab-apikeys"
    ) as HTMLButtonElement;
    if (autofillTab && profileTab && apiKeysTab && contentDiv) {
      autofillTab.addEventListener("click", () => {
        autofillTab.style.background = "#e6f7fa";
        autofillTab.style.color = "#00b6e6";
        profileTab.style.background = "#f5f5f5";
        profileTab.style.color = "#bdbdbd";
        apiKeysTab.style.background = "#f5f5f5";
        apiKeysTab.style.color = "#bdbdbd";
        getAutofillContent().then((content) => {
          contentDiv.innerHTML = content;
          // Setup generate button listener after content is added
          setTimeout(() => {
            setupGenerateButtonListener();
            setupCoverLetterAccordionListeners();
            setupAutofillButtonListener();
          }, 0);
        });
        // Remove scroll/height styles if present
        (contentDiv as HTMLElement).style.height = "";
        (contentDiv as HTMLElement).style.overflowY = "";
        (sidebar as HTMLElement).style.height = "auto";
        (sidebar as HTMLElement).style.maxHeight = "90vh";
      });
      profileTab.addEventListener("click", () => {
        profileTab.style.background = "#e6f7fa";
        profileTab.style.color = "#00b6e6";
        autofillTab.style.background = "#f5f5f5";
        autofillTab.style.color = "#bdbdbd";
        apiKeysTab.style.background = "#f5f5f5";
        apiKeysTab.style.color = "#bdbdbd";
        renderProfileTab();
        // Ensure scroll/height styles for profile tab
        setTimeout(() => {
          (sidebar as HTMLElement).style.height = "calc(100vh - 40px)";
          (sidebar as HTMLElement).style.maxHeight = "calc(100vh - 40px)";
          (contentDiv as HTMLElement).style.height =
            "calc(100vh - 40px - 70px)";
          (contentDiv as HTMLElement).style.overflowY = "auto";
        }, 0);
      });
      apiKeysTab.addEventListener("click", () => {
        apiKeysTab.style.background = "#e6f7fa";
        apiKeysTab.style.color = "#00b6e6";
        autofillTab.style.background = "#f5f5f5";
        autofillTab.style.color = "#bdbdbd";
        profileTab.style.background = "#f5f5f5";
        profileTab.style.color = "#bdbdbd";
        renderApiKeysTab();
        // Remove scroll/height styles if present
        (contentDiv as HTMLElement).style.height = "";
        (contentDiv as HTMLElement).style.overflowY = "";
        (sidebar as HTMLElement).style.height = "auto";
        (sidebar as HTMLElement).style.maxHeight = "90vh";
      });
    }

    // Sidebar close button
    sidebar
      .querySelector("#hiair-sidebar-close")
      ?.addEventListener("click", () => {
        sidebar.remove();
        if (typeof onClose === "function") onClose();
      });

    document.body.appendChild(sidebar);
  }
}

if (window.location.hostname.includes("ashbyhq.com")) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createHiairFloatingButton);
  } else {
    createHiairFloatingButton();
  }
}

export {};
