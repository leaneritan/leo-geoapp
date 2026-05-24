import { lessons } from './lessonData.js';
import { quizQuestions } from './quizData.js';

let currentSlide = 0;
let currentQuiz = 0;
let score = 0;
let onLessonCityChange = null;
let onTimeCitiesChange = null;

export function initUI({ flyToCity, drawArc } = {}) {
  onLessonCityChange = flyToCity || null;
  onTimeCitiesChange = drawArc || null;
  bindPanels();
  bindLessonButtons();
  bindQuizButtons();
  bindTimeTool();
  renderLesson(0);
  resetQuiz();
  updateTimeCalculation();
}

function bindPanels() {
  document.querySelectorAll('[data-panel-open]').forEach((btn) => {
    btn.addEventListener('click', () => openPanel(btn.dataset.panelOpen));
  });
  document.querySelectorAll('[data-panel-close]').forEach((btn) => {
    btn.addEventListener('click', () => closePanel(btn.dataset.panelClose));
  });
  document.getElementById('hide-all-btn')?.addEventListener('click', closeAllPanels);
}

function bindLessonButtons() {
  document.getElementById('lesson-prev')?.addEventListener('click', prevLesson);
  document.getElementById('lesson-next')?.addEventListener('click', nextLesson);
}

function bindQuizButtons() {
  document.getElementById('quiz-restart')?.addEventListener('click', resetQuiz);
}

function bindTimeTool() {
  document.getElementById('cityA')?.addEventListener('change', updateTimeCalculation);
  document.getElementById('cityB')?.addEventListener('change', updateTimeCalculation);
  document.getElementById('focus-city-btn')?.addEventListener('click', () => {
    const key = document.getElementById('cityA')?.value;
    if (key && onLessonCityChange) onLessonCityChange(key);
  });
}

export function openPanel(id) {
  closeAllPanels();
  document.getElementById(id)?.classList.add('open');
}

export function closePanel(id) {
  document.getElementById(id)?.classList.remove('open');
}

export function closeAllPanels() {
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('open'));
}

export function renderLesson(index) {
  currentSlide = index;
  const lesson = lessons[index];
  if (!lesson) return;
  document.getElementById('lesson-tag').textContent = lesson.tag;
  document.getElementById('lesson-title').textContent = lesson.title;
  document.getElementById('lesson-content').textContent = lesson.content;
  document.getElementById('lesson-count').textContent = `${index + 1} / ${lessons.length}`;
  document.getElementById('lesson-progress').style.width = `${((index + 1) / lessons.length) * 100}%`;
  document.getElementById('lesson-prev').disabled = index === 0;
  document.getElementById('lesson-next').textContent = index === lessons.length - 1 ? '最初に戻る' : '次へ ▶';
  if (lesson.city && onLessonCityChange) onLessonCityChange(lesson.city);
}

export function nextLesson() {
  if (currentSlide < lessons.length - 1) renderLesson(currentSlide + 1);
  else renderLesson(0);
}

export function prevLesson() {
  if (currentSlide > 0) renderLesson(currentSlide - 1);
}

function resetQuiz() {
  currentQuiz = 0;
  score = 0;
  renderQuiz();
}

function renderQuiz() {
  const q = quizQuestions[currentQuiz];
  const questionEl = document.getElementById('quiz-question');
  const metaEl = document.getElementById('quiz-meta');
  const optionsEl = document.getElementById('quiz-options');
  if (!questionEl || !metaEl || !optionsEl) return;
  if (!q) {
    questionEl.textContent = `終了！ SCORE ${score}/${quizQuestions.length}`;
    metaEl.textContent = 'Complete';
    optionsEl.innerHTML = '';
    return;
  }
  questionEl.textContent = q.q;
  metaEl.textContent = `${currentQuiz + 1} / ${quizQuestions.length}　SCORE: ${score}`;
  optionsEl.innerHTML = '';
  q.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = `${index + 1}. ${option}`;
    btn.addEventListener('click', () => answer(index));
    optionsEl.appendChild(btn);
  });
}

function answer(index) {
  const q = quizQuestions[currentQuiz];
  if (q && index === q.correct) score += 1;
  currentQuiz += 1;
  renderQuiz();
}

const calculatorCities = {
  tokyo: { name: '東京', lng: 135, dir: 'E', utc: 9 },
  london: { name: 'ロンドン', lng: 0, dir: 'E', utc: 0 },
  newyork: { name: 'ニューヨーク', lng: 75, dir: 'W', utc: -5 },
  cairo: { name: 'カイロ', lng: 30, dir: 'E', utc: 2 },
  sydney: { name: 'シドニー', lng: 150, dir: 'E', utc: 10 }
};

function updateTimeCalculation() {
  const keyA = document.getElementById('cityA')?.value || 'tokyo';
  const keyB = document.getElementById('cityB')?.value || 'london';
  const cA = calculatorCities[keyA];
  const cB = calculatorCities[keyB];
  if (!cA || !cB) return;
  const longDiff = cA.dir === cB.dir ? Math.abs(cA.lng - cB.lng) : cA.lng + cB.lng;
  const timeDiff = longDiff / 15;
  document.getElementById('step-long').innerHTML = `経度差: <strong>${cA.name} (${cA.lng}°${cA.dir}) ⇄ ${cB.name} (${cB.lng}°${cB.dir}) = ${longDiff}°</strong>`;
  document.getElementById('step-div').innerHTML = `計算式: <strong>${longDiff}° ÷ 15° = ${timeDiff}時間</strong>`;
  document.getElementById('calc-result').textContent = `${timeDiff} 時間`;
  const advanced = cA.utc > cB.utc ? `${cA.name} の方が進んでいます` : `${cB.name} の方が進んでいます`;
  document.getElementById('calc-explanation').textContent = `地球は1時間あたり15度回転します。${advanced}。`;
  if (onTimeCitiesChange) onTimeCitiesChange(keyA, keyB);
}
