/**
 * Generates the client-facing LMS User Guide (PDF) using pdfkit.
 *   Portal name      : LMS
 *   Delivered by     : Calcite Technologies
 *   Output           : ../docs/LMS-User-Guide.pdf
 * Run from the Backend folder:  node scripts/generate-guide.js
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PRIMARY = '#0A2952';
const ACCENT = '#C77700';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LIGHT = '#F4F6F9';
const BORDER = '#E5E7EB';

const OUT_DIR = path.join(__dirname, '..', '..', 'docs');
const OUT_FILE = path.join(OUT_DIR, 'LMS-User-Guide.pdf');
fs.mkdirSync(OUT_DIR, { recursive: true });

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 64, bottom: 64, left: 56, right: 56 },
  bufferPages: true,
  info: { Title: 'LMS — User Guide', Author: 'Calcite Technologies', Subject: 'LMS User Guide' },
});
doc.pipe(fs.createWriteStream(OUT_FILE));

const M = doc.page.margins;
const PAGE_W = doc.page.width;
const PAGE_H = doc.page.height;
const CONTENT_W = PAGE_W - M.left - M.right;
const BOTTOM = PAGE_H - M.bottom;

function ensureSpace(h) {
  if (doc.y + h > BOTTOM) doc.addPage();
}

function heading(label, title) {
  ensureSpace(78);
  doc.moveDown(0.4);
  const x = M.left;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text(String(label).toUpperCase(), x, doc.y, { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(20).fillColor(PRIMARY).text(title, x, doc.y + 2, { width: CONTENT_W });
  const uy = doc.y + 5;
  doc.save().rect(x, uy, 46, 3).fill(ACCENT).restore();
  doc.y = uy + 16;
  doc.x = x;
}

function subheading(title) {
  ensureSpace(40);
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(PRIMARY).text(title, M.left, doc.y, { width: CONTENT_W });
  doc.y += 4;
  doc.x = M.left;
}

function para(text) {
  ensureSpace(40);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(text, M.left, doc.y, { width: CONTENT_W, lineGap: 3, align: 'left' });
  doc.moveDown(0.6);
  doc.x = M.left;
}

function callout(text) {
  doc.font('Helvetica').fontSize(10.5);
  const pad = 12;
  const w = CONTENT_W - 2 * pad - 4;
  const h = doc.heightOfString(text, { width: w, lineGap: 3 }) + 2 * pad;
  ensureSpace(h + 8);
  const top = doc.y;
  doc.save().roundedRect(M.left, top, CONTENT_W, h, 8).fill(LIGHT).restore();
  doc.save().rect(M.left, top, 4, h).fill(ACCENT).restore();
  doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(text, M.left + pad + 4, top + pad, { width: w, lineGap: 3 });
  doc.y = top + h;
  doc.moveDown(0.6);
  doc.x = M.left;
}

function feature(title, desc) {
  const sq = 8;
  const textX = M.left + 18;
  const w = CONTENT_W - 18;
  doc.font('Helvetica-Bold').fontSize(11);
  const tH = doc.heightOfString(title, { width: w });
  doc.font('Helvetica').fontSize(10);
  const dH = doc.heightOfString(desc, { width: w, lineGap: 2 });
  ensureSpace(tH + dH + 12);
  const top = doc.y;
  doc.save().rect(M.left, top + 3, sq, sq).fill(ACCENT).restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(PRIMARY).text(title, textX, top, { width: w });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(desc, textX, doc.y + 1, { width: w, lineGap: 2 });
  doc.moveDown(0.55);
  doc.x = M.left;
}

function step(n, title, desc) {
  const r = 11;
  const textX = M.left + 34;
  const w = CONTENT_W - 34;
  doc.font('Helvetica-Bold').fontSize(11);
  const tH = doc.heightOfString(title, { width: w });
  doc.font('Helvetica').fontSize(10);
  const dH = doc.heightOfString(desc, { width: w, lineGap: 2 });
  ensureSpace(Math.max(2 * r, tH + dH) + 14);
  const top = doc.y;
  doc.save().circle(M.left + r, top + r, r).fill(PRIMARY).restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text(String(n), M.left, top + r - 6, { width: 2 * r, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(PRIMARY).text(title, textX, top, { width: w });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(desc, textX, doc.y + 1, { width: w, lineGap: 2 });
  doc.y = Math.max(doc.y, top + 2 * r);
  doc.moveDown(0.6);
  doc.x = M.left;
}

/* ── Cover ─────────────────────────────────────────────────────────── */
doc.save().rect(0, 0, PAGE_W, 320).fill(PRIMARY).restore();
doc.save().rect(0, 320, PAGE_W, 6).fill(ACCENT).restore();

doc.font('Helvetica-Bold').fontSize(13).fillColor('#FFFFFF').opacity(0.75).text('CALCITE TECHNOLOGIES', M.left, 70, { characterSpacing: 2 });
doc.opacity(1);
doc.font('Helvetica-Bold').fontSize(72).fillColor('#FFFFFF').text('LMS', M.left, 120);
doc.font('Helvetica').fontSize(18).fillColor('#FFFFFF').opacity(0.85).text('Learning Management System', M.left, 210);
doc.opacity(1);

doc.font('Helvetica-Bold').fontSize(30).fillColor(PRIMARY).text('User Guide', M.left, 384);
doc.font('Helvetica').fontSize(12.5).fillColor(MUTED).text('A complete guide to the platform for administrators and learners.', M.left, 424, { width: CONTENT_W });

doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text('DELIVERED BY', M.left, 520, { characterSpacing: 1.5 });
doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text('Calcite Technologies', M.left, 534);

doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Version 1.0  ·  June 2026', M.left, 564);

doc.save().moveTo(M.left, 650).lineTo(PAGE_W - M.right, 650).lineWidth(0.5).strokeColor(BORDER).stroke().restore();
doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('This document is provided by Calcite Technologies for the intended client. © 2026 Calcite Technologies. All rights reserved.', M.left, 664, { width: CONTENT_W });

/* ── 1. Introduction ──────────────────────────────────────────────── */
doc.addPage();
heading('Section 1', 'Introduction');
para('LMS is a modern learning management platform delivered by Calcite Technologies. It gives your organisation a simple, professional way to publish online courses, and gives your people a clean, focused place to complete them.');
para('Administrators build a structured catalogue of courses, upload learning content, and enrol the right people. Learners then work through video, document and reading lessons at their own pace — with progress tracking, personal notes, bookmarks, reviews and automatic certificates all built in.');
callout('This guide is organised into three parts: an overview of what LMS does, a summary of its key features, and step-by-step instructions for using the platform — first for administrators, then for students.');

/* ── 2. Key features ──────────────────────────────────────────────── */
heading('Section 2', 'Key Features');
para('LMS brings everything needed to deliver online learning into one branded, easy-to-use portal.');
feature('Structured course catalogue', 'Organise learning into courses, modules (chapters) and individual lessons, so material is easy to navigate and complete.');
feature('Rich, flexible content', 'Deliver lessons as video (YouTube, Vimeo or uploaded files), PDFs, Word and PowerPoint documents, images, audio, web links, or formatted text — all viewable directly in the browser.');
feature('Enrolment-based access', 'Learners only see the courses they have been enrolled in, keeping content private and access under your control.');
feature('Automatic progress tracking', 'Lessons remember where each learner left off and complete automatically as they are finished. Progress is shown for each lesson, module and the overall course.');
feature('Personal notes', 'Learners capture their own notes against any lesson — time-stamped to the exact moment in a video so they can jump back later.');
feature('Bookmarks', 'Save important moments in a lesson and return to them in a single click.');
feature('Ratings and reviews', 'Learners can rate a course and share written feedback, and mark other reviews as helpful.');
feature('Certificates of completion', 'A professional PDF certificate is generated automatically the moment a learner reaches 100% completion, ready to download.');
feature('Personalised “My Learning” dashboard', 'Each learner gets a personal home page showing their enrolled courses, progress at a glance, and quick filters for in-progress, completed and not-yet-started courses.');
feature('Modern, branded experience', 'A clean, responsive interface that adapts to your organisation’s colours and logo, with both light and dark modes.');

/* ── 3. Getting started ───────────────────────────────────────────── */
heading('Section 3', 'Getting Started');
para('LMS has two kinds of users, and the portal automatically shows each person only the tools relevant to their role:');
feature('Administrators', 'Create and manage courses, upload content, enrol learners, and monitor progress and certificates.');
feature('Students (learners)', 'Access the courses they are enrolled in, complete lessons at their own pace, and earn certificates.');
para('Both administrators and students sign in at the same web address using the account details provided to them. After signing in, administrators land on the management tools, while students go straight to their “My Learning” area.');

/* ── 4. Administrator guide ───────────────────────────────────────── */
heading('Section 4', 'How to Use — Administrators');
para('Follow these steps to publish a course and make it available to your learners.');
step(1, 'Sign in', 'Open the portal in your web browser and sign in with your administrator account.');
step(2, 'Create a course', 'Go to Courses and select “New course”. Enter the title, description, level and category, add any tags, and optionally upload a cover image. New courses start as a private draft.');
step(3, 'Build the curriculum', 'Open the course and add Modules (think of these as chapters). Inside each module, add resources: upload a file (video, PDF, slides, image or audio), paste a link such as a YouTube video, or write a text lesson. Drag items to reorder them, and mark any lesson as a free “Preview” if you wish.');
step(4, 'Publish', 'Publish the modules and resources, then publish the course itself. Only published content is visible to enrolled learners.');
step(5, 'Enrol your learners', 'From the course (or the Enrolments area), add the students who should have access. Enrolment is what gives a learner access to a course.');
step(6, 'Track progress', 'View each learner’s progress and certificate status from the course’s enrolment list, so you always know how your people are tracking.');
step(7, 'Preview as a student', 'Use “Preview as student” to experience the course exactly as a learner will, before or after publishing.');

/* ── 5. Student guide ─────────────────────────────────────────────── */
heading('Section 5', 'How to Use — Students');
para('Here is how to find a course, complete it, and earn your certificate.');
step(1, 'Sign in', 'Open the portal and sign in with the account details provided by your administrator.');
step(2, 'Open “My Learning”', 'Your “My Learning” page lists every course you are enrolled in, with your progress shown at a glance. Use the search box or the status filters (In Progress, Completed, Not Started) to find a course quickly, and switch between grid and list views.');
step(3, 'Start a course', 'Select a course to open the learning player. The “Course content” panel on the right lists every module and lesson, and shows your progress as you go.');
step(4, 'Work through the lessons', 'Watch videos or open documents directly in the player. Your position is saved automatically, and lessons complete as you finish them — you can also use “Mark complete” at any time. Use the arrows or “Next lesson” to move through the course.');
step(5, 'Take notes and bookmarks', 'Use the Notes and Bookmarks tabs beneath the lesson to capture key points. On videos these are time-stamped, so you can jump straight back to the right moment.');
step(6, 'Leave a review', 'Share a star rating and written feedback from the Reviews tab to help others.');
step(7, 'Earn your certificate', 'When you reach 100% completion, your certificate is issued automatically. Download it from the course at any time — a professional PDF you can keep or share.');

/* ── 6. Support ───────────────────────────────────────────────────── */
heading('Section 6', 'Support');
para('Your LMS platform is delivered and supported by Calcite Technologies. For assistance, additional configuration, branding changes or training for your team, please contact your Calcite Technologies representative.');
callout('Thank you for choosing LMS, delivered by Calcite Technologies. We hope your team enjoys a simpler, more engaging way to learn.');

/* ── Footers ──────────────────────────────────────────────────────── */
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  if (i === 0) continue; // skip the cover
  // Writing inside the bottom margin would make pdfkit auto-add a page — drop the margin first.
  doc.page.margins.bottom = 0;
  const y = PAGE_H - 42;
  doc.save();
  doc.moveTo(M.left, y).lineTo(PAGE_W - M.right, y).lineWidth(0.5).strokeColor(BORDER).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED);
  doc.text('LMS — User Guide', M.left, y + 7, { width: CONTENT_W, align: 'left', lineBreak: false });
  doc.text('Delivered by Calcite Technologies', M.left, y + 7, { width: CONTENT_W, align: 'center', lineBreak: false });
  doc.text(`Page ${i}`, M.left, y + 7, { width: CONTENT_W, align: 'right', lineBreak: false });
  doc.restore();
}

doc.end();
console.log('Guide written to:', OUT_FILE);
