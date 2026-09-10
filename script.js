// ✅【已為您填寫】您最新的 Google Apps Script Web App 網址
const API_URL = "https://script.google.com/macros/s/AKfycbx5K8m7YQfcDbPuY81zqGoQJ5U1gUgoSG1QTCyQyQq79Yv2c-Mw_thmqTyrkykXeKPz5Q/exec"; 

let currentClass = "";
let studentList = [];
let batchAction = { type: '', value: 0 }; // 儲存當前批次操作的類型和分數

// 頁面切換控制
function switchView(viewId) {
    const views = ["view-home", "view-menu", "view-lottery", "view-batch"];
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

// 返回按鈕
function goBack() {
    const currentVisible = ["view-menu", "view-lottery", "view-batch"].find(id => !document.getElementById(id).classList.contains("hidden"));
    if (currentVisible) {
        switchView("view-menu");
        const title = currentClass.includes('班') || currentClass.includes('生物') ? `${currentClass} 功能` : `${currentClass}班 功能`;
        document.getElementById("app-title").textContent = title;
    } else {
        switchView("view-home");
    }
}

// 讀取遮罩
function showLoading(show) {
    document.getElementById("loading").classList.toggle("hidden", !show);
}

// 選擇班級並獲取學生名單
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
        } else {
            alert("讀取失敗：" + (rawData.message || "Google Sheet 回傳的資料格式不正確或為空。"));
            switchView("view-home");
        }
    } catch (error) {
        alert(`連線 Google Sheets 失敗，請檢查 API URL 是否正確，且 Apps Script 已部署為「所有人」可存取。\n\n錯誤詳情: ${error.toString()}`);
        switchView("view-home");
    } finally {
        showLoading(false);
    }
}

// 格式化學生姓名顯示
function getFormattedStudentName(student) {
    if (!student) return "";
    return student.origClass ? `${student.origClass} (${student.id}) ${student.name}` : `(${student.id}) ${student.name}`;
}

// 💡【全新】開啟批次處理頁面 (整合了所有加減分與檢查書本)
function openBatchAction(type, value, title) {
    batchAction = { type, value };
    
    document.getElementById("batch-title").textContent = title;
    const listContainer = document.getElementById("batch-student-list");
    listContainer.innerHTML = "";
    document.getElementById("event-desc").value = (type === 'book' ? '沒有帶書' : '');
    document.getElementById("event-desc").readOnly = (type === 'book');

    const submitBtn = document.getElementById("batch-submit-btn");
    if (type === 'book') {
        submitBtn.className = "w-full text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-95 bg-amber-500 hover:bg-amber-600";
        submitBtn.innerHTML = `<i class="fa-solid fa-check-double mr-1"></i> 儲存沒帶書紀錄 (-1分)`;
    } else if (value > 0) {
        submitBtn.className = "w-full text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-95 bg-emerald-500 hover:bg-emerald-600";
        submitBtn.innerHTML = `<i class="fa-solid fa-check-double mr-1"></i> 提交加分紀錄 (+${value}分)`;
    } else {
        submitBtn.className = "w-full text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-95 bg-rose-500 hover:bg-rose-600";
        submitBtn.innerHTML = `<i class="fa-solid fa-check-double mr-1"></i> 提交扣分紀錄 (${value}分)`;
    }
    
    studentList.forEach(student => {
        const item = document.createElement("div");
        item.className = "flex items-center justify-between py-4 px-2";
        const displayName = getFormattedStudentName(student);
        item.innerHTML = `
            <span class="font-bold text-slate-700 text-lg">${displayName}</span>
            <input type="checkbox" data-name="${student.name}" class="batch-checkbox w-7 h-7 text-blue-600 rounded-lg focus:ring-blue-500 focus:ring-2 border-slate-300">
        `;
        listContainer.appendChild(item);
    });

    switchView("view-batch");
}

// 💡【全新】提交批次操作
async function submitBatchAction() {
    const checkboxes = document.querySelectorAll(".batch-checkbox:checked");
    if (checkboxes.length === 0) {
        alert("您沒有勾選任何學生！");
        return;
    }
    
    const selectedNames = Array.from(checkboxes).map(cb => cb.getAttribute("data-name"));
    const eventDesc = document.getElementById("event-desc").value.trim() || (batchAction.type === 'book' ? '沒有帶書' : '沒有描述');

    if (!confirm(`確定要為這 ${selectedNames.length} 位同學執行「${document.getElementById("batch-title").textContent}」嗎？`)) return;

    showLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                className: currentClass,
                students: selectedNames,
                eventDesc: eventDesc,
                type: batchAction.type,
                value: batchAction.value
            })
        });
        const result = await res.json();
        if (result.status === "success") {
            switchView('view-menu'); // 成功後直接返回主選單
        } else {
            alert("儲存失敗：" + result.message);
        }
    } catch (e) {
        alert("連線失敗！ " + e.toString());
    } finally {
        showLoading(false);
    }
}

// 初始化抽籤介面
function initLottery() {
    selectedStudent = null;
    const display = document.getElementById("lottery-display");
    display.textContent = "準備抽籤...";
    display.className = "bg-white border-2 border-dashed border-indigo-300 h-56 rounded-2xl shadow-inner flex items-center justify-center text-3xl font-black text-indigo-600 transition-all text-center px-4";
    document.getElementById("lottery-actions").classList.add("hidden");
    document.getElementById("btn-draw").disabled = false;
    switchView("view-lottery");
}

// 執行抽籤動畫
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

// 抽籤快速評分按鈕動作
async function actionSelectedStudent(type, value, eventDesc) {
    if (!selectedStudent) return;
    
    if (value === 0) {
        initLottery();
        return;
    }

    showLoading(true);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                className: currentClass,
                students: [selectedStudent.name],
                eventDesc: eventDesc,
                type: type,
                value: value
            })
        });
        const result = await res.json();
        if (result.status === "success") {
            initLottery();
        } else {
            alert("儲存失敗：" + result.message);
        }
    } catch (e) {
        alert("連線失敗！ " + e.toString());
    } finally {
        showLoading(false);
    }
}
