// ⚠️ 請在此處貼上您剛才從 Google Apps Script 複製的 Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxAkp1jbi_aPCIoNClC5g23mysJXb5jfn6yXfuNOwwygEsXRi0pRPhPS26L0iVtQZHJQg/exec"; 

let currentClass = "";
let studentList = []; // 存放當前班級的學生資料
let selectedStudent = null; // 當前被抽中的學生

// 頁面切換控制
function switchView(viewId) {
  const views = ["view-home", "view-menu", "view-book", "view-lottery", "view-batch"];
  views.forEach(v => {
    document.getElementById(v).classList.add("hidden");
  });
  document.getElementById(viewId).classList.remove("hidden");
  
  // 顯示/隱藏頂部返回按鈕
  const btnBack = document.getElementById("btn-back");
  if (viewId === "view-home") {
    btnBack.classList.add("hidden");
    document.getElementById("app-title").textContent = "課堂管理系統";
  } else {
    btnBack.classList.remove("hidden");
  }
}

// 點擊返回按鈕
function goBack() {
  const currentVisible = ["view-menu", "view-book", "view-lottery", "view-batch"].find(id => {
    return !document.getElementById(id).classList.contains("hidden");
  });

  if (currentVisible === "view-menu") {
    switchView("view-home");
  } else {
    switchView("view-menu");
    document.getElementById("app-title").textContent = `${currentClass} 班級功能`;
  }
}

// 顯示讀取遮罩
function showLoading(show) {
  const loader = document.getElementById("loading");
  if (show) loader.classList.remove("hidden");
  else loader.classList.add("hidden");
}

// 首頁選擇班級
async function selectClass(className) {
  currentClass = className;
  document.getElementById("app-title").textContent = `${className} 班級功能`;
  showLoading(true);
  
  try {
    // 從 Google Sheet API 獲取該班級名單
    const response = await fetch(`${API_URL}?action=getStudents&className=${encodeURIComponent(className)}`);
    studentList = await response.json();
    
    if (studentList.status === "error") {
      alert("讀取失敗：" + studentList.message);
      switchView("view-home");
    } else {
      switchView("view-menu");
    }
  } catch (error) {
    console.error(error);
    alert("連線 Google Sheets 失敗，請確認 API URL 是否正確且已公開發布。");
    switchView("view-home");
  } finally {
    showLoading(false);
  }
}

// 初始化檢查書本清單
function initBookCheck() {
  const listContainer = document.getElementById("book-student-list");
  listContainer.innerHTML = "";
  
  if (studentList.length === 0) {
    listContainer.innerHTML = `<p class="p-4 text-center text-slate-400">名單中沒有學生，請先在 Sheet 中輸入資料。</p>`;
    return;
  }

  studentList.forEach(student => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between py-3 px-1";
    item.innerHTML = `
      <div class="flex flex-col">
        <span class="font-bold text-slate-700">${student.name}</span>
        <span class="text-xs text-slate-400">目前欠書：${student.noBook} 次 | 總分：${student.score}</span>
      </div>
      <input type="checkbox" data-name="${student.name}" class="book-checkbox w-6 h-6 text-amber-500 rounded-lg focus:ring-amber-400 focus:ring-2 border-slate-300">
    `;
    listContainer.appendChild(item);
  });
}

// 提交檢查書本紀錄 (送出給沒帶書的人，扣一分)
async function submitBookCheck() {
  const checkboxes = document.querySelectorAll(".book-checkbox:checked");
  if (checkboxes.length === 0) {
    alert("您沒有勾選任何沒帶書的同學！");
    return;
  }

  if (!confirm(`確定要為這 ${checkboxes.length} 位同學登記「沒帶書」並扣 1 分嗎？`)) return;

  showLoading(true);
  let successCount = 0;

  for (let box of checkboxes) {
    const name = box.getAttribute("data-name");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          className: currentClass,
          studentName: name,
          type: "book",
          value: 1 // 沒帶書次數 +1
        })
      });
      const result = await res.json();
      if (result.status === "success") successCount++;
    } catch (e) {
      console.error(e);
    }
  }

  showLoading(false);
  alert(`成功儲存！已為 ${successCount} 位同學登記沒帶書並扣分。`);
  selectClass(currentClass); // 重新載入最新數據
}

// 初始化抽籤介面
function initLottery() {
  selectedStudent = null;
  document.getElementById("lottery-display").textContent = "準備抽籤...";
  document.getElementById("lottery-display").className = "bg-white border-2 border-dashed border-indigo-300 h-48 rounded-2xl shadow-inner flex items-center justify-center text-4xl font-black text-indigo-600 transition-all";
  document.getElementById("lottery-actions").classList.add("hidden");
  document.getElementById("btn-draw").disabled = false;
  switchView("view-lottery");
}

// 執行抽籤動畫
function startDraw() {
  if (studentList.length === 0) {
    alert("班級名單中沒有學生！");
    return;
  }

  const display = document.getElementById("lottery-display");
  const btnDraw = document.getElementById("btn-draw");
  
  btnDraw.disabled = true;
  display.classList.add("lottery-active");
  document.getElementById("lottery-actions").classList.add("hidden");

  let duration = 2000; // 滾動動畫持續2秒
  let intervalTime = 80; // 每 80 毫秒換一個名字
  let elapsed = 0;
  let tempSelected = "";

  const timer = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * studentList.length);
    tempSelected = studentList[randomIndex];
    display.textContent = tempSelected.name;
    elapsed += intervalTime;

    if (elapsed >= duration) {
      clearInterval(timer);
      display.classList.remove("lottery-active");
      
      // 最終選中
      selectedStudent = tempSelected;
      display.textContent = `🎯 ${selectedStudent.name}`;
      display.className = "bg-yellow-100 border-2 border-yellow-400 h-48 rounded-2xl shadow-md flex items-center justify-center text-4xl font-black text-amber-700 transition-all scale-105 duration-300";
      
      // 顯示加減分按鈕
      document.getElementById("selected-student-label").textContent = selectedStudent.name;
      document.getElementById("lottery-actions").classList.remove("hidden");
      btnDraw.disabled = false;
    }
  }, intervalTime);
}

// 抽籤快速評分按鈕動作
async function actionSelectedStudent(type, value) {
  if (!selectedStudent) return;
  
  showLoading(true);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        className: currentClass,
        studentName: selectedStudent.name,
        type: type,
        value: value
      })
    });
    const result = await res.json();
    if (result.status === "success") {
      alert(`已為 ${selectedStudent.name} 登記：${value > 0 ? '+' : ''}${value}分！`);
      // 重新加載本班數據
      await selectClass(currentClass);
      initLottery(); // 重設抽籤畫面
    } else {
      alert("儲存失敗：" + result.message);
    }
  } catch (e) {
    console.error(e);
    alert("連線失敗！");
  } finally {
    showLoading(false);
  }
}

// 開啟快速加扣分名單
function openBatchAction(type, value, title) {
  const listContainer = document.getElementById("batch-student-list");
  document.getElementById("batch-desc").innerHTML = `<i class="fa-solid fa-hand-pointer mr-1"></i> 點擊下方同學，將直接進行 <strong>${title} (${value > 0 ? '+' : ''}${value}分)</strong>：`;
  listContainer.innerHTML = "";
  
  studentList.forEach(student => {
    const item = document.createElement("button");
    item.className = "w-full text-left flex justify-between items-center py-4 px-3 hover:bg-slate-50 transition-all border-b border-slate-100 active:bg-slate-100";
    item.onclick = () => submitSingleAction(student.name, type, value);
    item.innerHTML = `
      <div class="flex flex-col">
        <span class="font-bold text-slate-700 text-lg">${student.name}</span>
        <span class="text-xs text-slate-400">目前總分：${student.score} </span>
      </div>
      <span class="${value > 0 ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'} px-3 py-1 rounded-full text-sm font-bold">
        ${value > 0 ? '+' : ''}${value} 分
      </span>
    `;
    listContainer.appendChild(item);
  });
  
  switchView("view-batch");
}

// 送出單一學生的快速加扣分
async function submitSingleAction(name, type, value) {
  if (!confirm(`確定要為 ${name} ${value > 0 ? '加' : '扣'} ${Math.abs(value)} 分嗎？`)) return;
  
  showLoading(true);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        className: currentClass,
        studentName: name,
        type: type,
        value: value
      })
    });
    const result = await res.json();
    if (result.status === "success") {
      alert("儲存成功！");
      await selectClass(currentClass); // 更新本地名單
      // 重新渲染當前加扣分畫面
      openBatchAction(type, value, value > 0 ? '表現加分' : '扣分處理');
    } else {
      alert("儲存失敗：" + result.message);
    }
  } catch (e) {
    console.error(e);
    alert("同步失敗！");
  } finally {
    showLoading(false);
  }
}

// 監聽按鈕點擊，用來優化「檢查書本」等按鈕的畫面初始渲染
document.addEventListener("DOMContentLoaded", () => {
  // 當點擊檢查書本，載入清單
  const btnBookView = document.querySelector('[onclick="switchView(\'view-book\')"]');
  if (btnBookView) {
    btnBookView.addEventListener("click", () => {
      initBookCheck();
    });
  }
});
