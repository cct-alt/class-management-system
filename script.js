// ✅【已為您填寫】您的 Google Apps Script Web App 網址
const API_URL = "https://script.google.com/macros/s/AKfycbxAkp1jbi_aPCIoNClC5g23mysJXb5jfn6yXfuNOwwygEsXRi0pRPhPS26L0iVtQZHJQg/exec"; 

let currentClass = "";
let studentList = [];
let selectedStudent = null;

function switchView(viewId) {
    const views = ["view-home", "view-menu", "view-book", "view-lottery", "view-batch"];
    views.forEach(v => document.getElementById(v).classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
    const btnBack = document.getElementById("btn-back");
    if (viewId === "view-home") {
        btnBack.classList.add("hidden");
        document.getElementById("app-title").textContent = "課堂管理系統";
    } else {
        btnBack.classList.remove("hidden");
    }
}

function goBack() {
    const currentVisible = ["view-menu", "view-book", "view-lottery", "view-batch"].find(id => !document.getElementById(id).classList.contains("hidden"));
    if (currentVisible === "view-menu") {
        switchView("view-home");
    } else {
        switchView("view-menu");
        const title = currentClass.includes('班') || currentClass.includes('生物') ? `${currentClass} 功能` : `${currentClass}班 功能`;
        document.getElementById("app-title").textContent = title;
    }
}

function showLoading(show) {
    document.getElementById("loading").classList.toggle("hidden", !show);
}

async function selectClass(className) {
    currentClass = className;
    const title = className.includes('班') || className.includes('生物') ? `${className} 功能` : `${className}班 功能`;
    document.getElementById("app-title").textContent = title;
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}?action=getStudents&className=${className}`);
        const rawData = await response.json();
        if (rawData && Array.isArray(rawData)) {
            studentList = rawData;
            switchView("view-menu");
        } else if (rawData && rawData.status === "error") {
            alert("讀取失敗：" + rawData.message);
            switchView("view-home");
        } else {
            alert("讀取失敗：Google Sheet 回傳了空資料。請確認該 Sheet 內是否有學生名單。");
            switchView("view-home");
        }
    } catch (error) {
        console.error(error);
        alert("連線 Google Sheets 失敗，請確認 API URL 是否正確，且 Apps Script 已重新部署為「所有人(Anyone)」可以存取。");
        switchView("view-home");
    } finally {
        showLoading(false);
    }
}

function getFormattedStudentName(student) {
    if (!student) return "";
    return student.origClass ? `${student.origClass} (${student.id}) ${student.name}` : `(${student.id}) ${student.name}`;
}

function initBookCheck() {
    const listContainer = document.getElementById("book-student-list");
    listContainer.innerHTML = "";
    if (studentList.length === 0) {
        listContainer.innerHTML = `<p class="p-4 text-center text-slate-400">名單中沒有學生，請先在 Google Sheet 中輸入資料。</p>`;
        return;
    }
    studentList.forEach(student => {
        const item = document.createElement("div");
        item.className = "flex items-center justify-between py-4 px-2";
        const displayName = getFormattedStudentName(student);
        item.innerHTML = `
      <div class="flex flex-col">
        <span class="font-bold text-slate-700 text-lg">${displayName}</span>
        <span class="text-xs text-slate-500">目前欠書：${student.noBook} 次</span>
      </div>
      <input type="checkbox" data-name="${student.name}" class="book-checkbox w-7 h-7 text-amber-500 rounded-lg focus:ring-amber-400 focus:ring-2 border-slate-300">
    `;
        listContainer.appendChild(item);
    });
}

async function submitBookCheck() {
    const checkboxes = document.querySelectorAll(".book-checkbox:checked");
    if (checkboxes.length === 0) return alert("您沒有勾選任何沒帶書的同學！");
    if (!confirm(`確定要為這 ${checkboxes.length} 位同學登記「沒帶書」並扣 1 分嗎？`)) return;
    showLoading(true);
    let successCount = 0;
    for (let box of checkboxes) {
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ className: currentClass, studentName: box.getAttribute("data-name"), type: "book", value: 1 })
            });
            const result = await res.json();
            if (result.status === "success") successCount++;
        } catch (e) { console.error(e); }
    }
    showLoading(false);
    // 💡【已更新】移除確認彈窗
    // alert(`成功儲存！已為 ${successCount} 位同學登記沒帶書並扣分。`);
    await selectClass(currentClass);
}

function initLottery() {
    selectedStudent = null;
    const display = document.getElementById("lottery-display");
    display.textContent = "準備抽籤...";
    display.className = "bg-white border-2 border-dashed border-indigo-300 h-56 rounded-2xl shadow-inner flex items-center justify-center text-3xl font-black text-indigo-600 transition-all text-center px-4";
    document.getElementById("lottery-actions").classList.add("hidden");
    document.getElementById("btn-draw").disabled = false;
    switchView("view-lottery");
}

function startDraw() {
    if (studentList.length === 0) return alert("班級名單中沒有學生！");
    const display = document.getElementById("lottery-display");
    const btnDraw = document.getElementById("btn-draw");
    btnDraw.disabled = true;
    display.classList.add("lottery-active");
    document.getElementById("lottery-actions").classList.add("hidden");
    let duration = 2500, intervalTime = 60, elapsed = 0;
    const timer = setInterval(() => {
        const tempSelected = studentList[Math.floor(Math.random() * studentList.length)];
        display.textContent = getFormattedStudentName(tempSelected);
        elapsed += intervalTime;
        if (elapsed >= duration) {
            clearInterval(timer);
            display.classList.remove("lottery-active");
            selectedStudent = studentList[Math.floor(Math.random() * studentList.length)];
            const finalDisplayName = getFormattedStudentName(selectedStudent);
            display.textContent = `🎯 ${finalDisplayName}`;
            display.className = "lottery-revealed bg-yellow-300 border-2 border-yellow-500 h-56 rounded-2xl shadow-lg flex items-center justify-center text-3xl font-black text-amber-800 transition-all text-center px-4";
            document.getElementById("selected-student-label").textContent = finalDisplayName;
            document.getElementById("lottery-actions").classList.remove("hidden");
            btnDraw.disabled = false;
        }
    }, intervalTime);
}

async function actionSelectedStudent(type, value) {
    if (!selectedStudent) return;
    if (value === 0) {
        initLottery();
        return;
    }
    showLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ className: currentClass, studentName: selectedStudent.name, type, value })
        });
        const result = await res.json();
        if (result.status === "success") {
            // 💡【已更新】移除確認彈窗
            // alert(`已為 ${selectedStudent.name} 登記：${value > 0 ? '+' : ''}${value}分！`);
            await selectClass(currentClass);
            initLottery();
        } else {
            alert("儲存失敗：" + result.message);
        }
    } catch (e) {
        alert("連線失敗！");
    } finally {
        showLoading(false);
    }
}

function openBatchAction(type, value, title) {
    const listContainer = document.getElementById("batch-student-list");
    document.getElementById("batch-desc").innerHTML = `<i class="fa-solid fa-hand-pointer mr-1"></i> 點擊下方同學，將直接進行 <strong>${title} (${value > 0 ? '+' : ''}${value}分)</strong>：`;
    listContainer.innerHTML = "";
    studentList.forEach(student => {
        const item = document.createElement("button");
        item.className = "w-full text-left flex justify-between items-center py-4 px-3 hover:bg-slate-100 transition-all border-b border-slate-200 active:bg-slate-200";
        item.onclick = () => submitSingleAction(student.name, type, value);
        const displayName = getFormattedStudentName(student);
        item.innerHTML = `
      <div class="flex flex-col">
        <span class="font-bold text-slate-700 text-lg">${displayName}</span>
      </div>
      <span class="${value > 0 ? 'text-emerald-500 bg-emerald-100' : 'text-rose-500 bg-rose-100'} px-3 py-1 rounded-full text-sm font-bold">
        ${value > 0 ? '+' : ''}${value} 分
      </span>
    `;
        listContainer.appendChild(item);
    });
    switchView("view-batch");
}

async function submitSingleAction(name, type, value) {
    if (!confirm(`確定要為 ${name} ${value > 0 ? '加' : '扣'} ${Math.abs(value)} 分嗎？`)) return;
    showLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ className: currentClass, studentName: name, type, value })
        });
        const result = await res.json();
        if (result.status === "success") {
            // 💡【已更新】移除確認彈窗
            // alert("儲存成功！");
            await selectClass(currentClass);
            openBatchAction(type, value, value > 0 ? '表現加分' : '扣分處理');
        } else {
            alert("儲存失敗：" + result.message);
        }
    } catch (e) {
        alert("同步失敗！");
    } finally {
        showLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnBookView = document.querySelector('[onclick="switchView(\'view-book\')"]');
    if (btnBookView) {
        btnBookView.addEventListener("click", () => initBookCheck());
    }
});
