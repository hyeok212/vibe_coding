// ========================================
// Todo 앱 - Firebase 연동
// ========================================

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDb8fb6b4kn14B9i5FFMulWzCENagmWqSU",
    authDomain: "todo-backend-8ba04.firebaseapp.com",
    databaseURL: "https://todo-backend-8ba04-default-rtdb.firebaseio.com",
    projectId: "todo-backend-8ba04",
    storageBucket: "todo-backend-8ba04.firebasestorage.app",
    messagingSenderId: "9822189390",
    appId: "1:9822189390:web:9555c74b338bfec358901f",
    measurementId: "G-84PTQCD3MT"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 데이터베이스 참조
const todosRef = database.ref('todos');
const categoriesRef = database.ref('categories');

// 상태 관리
const state = {
    todos: [],
    categories: ['업무', '개인', '쇼핑', '기타'],
    currentFilter: {
        category: 'all',
        priority: 'all',
        status: 'all'
    },
    currentSort: 'createdAt',
    editingId: null,
    deletingId: null,
    isLoading: true
};

// DOM 요소
const elements = {
    // 폼
    addTodoForm: document.getElementById('add-todo-form'),
    todoTitle: document.getElementById('todo-title'),
    todoPriority: document.getElementById('todo-priority'),
    todoDueDate: document.getElementById('todo-due-date'),
    todoCategory: document.getElementById('todo-category'),

    // 리스트
    todoList: document.getElementById('todo-list'),
    emptyState: document.getElementById('empty-state'),

    // 사이드바
    sidebar: document.getElementById('sidebar'),
    categoryList: document.getElementById('category-list'),
    newCategoryInput: document.getElementById('new-category-input'),
    addCategoryBtn: document.getElementById('add-category-btn'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),

    // 필터
    filterPriority: document.getElementById('filter-priority'),
    filterStatus: document.getElementById('filter-status'),
    sortBy: document.getElementById('sort-by'),

    // 통계
    totalCount: document.getElementById('total-count'),
    completedCount: document.getElementById('completed-count'),
    pendingCount: document.getElementById('pending-count'),

    // 수정 모달
    modalOverlay: document.getElementById('modal-overlay'),
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    editId: document.getElementById('edit-id'),
    editTitle: document.getElementById('edit-title'),
    editPriority: document.getElementById('edit-priority'),
    editDueDate: document.getElementById('edit-due-date'),
    editCategory: document.getElementById('edit-category'),
    modalClose: document.getElementById('modal-close'),
    btnCancel: document.getElementById('btn-cancel'),

    // 삭제 모달
    deleteModalOverlay: document.getElementById('delete-modal-overlay'),
    deleteCancel: document.getElementById('delete-cancel'),
    deleteConfirm: document.getElementById('delete-confirm'),

    // 테마 토글
    themeToggle: document.getElementById('theme-toggle')
};

// ========================================
// 유틸리티 함수
// ========================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
}

function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
}

function isDueSoon(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
}

function getPriorityLabel(priority) {
    const labels = {
        high: '높음',
        medium: '중간',
        low: '낮음'
    };
    return labels[priority] || priority;
}

function getPriorityOrder(priority) {
    const order = { high: 0, medium: 1, low: 2 };
    return order[priority] ?? 1;
}

// ========================================
// 테마 관리
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const iconEye = elements.themeToggle.querySelector('.icon-eye');
    if (iconEye) {
        // 다크모드: 눈 뜬 상태, 라이트모드: 눈 감은 상태
        iconEye.textContent = theme === 'light' ? '🌙' : '👁';
    }
}

// ========================================
// Firebase 데이터 관리
// ========================================

// 실시간 데이터 리스너 설정
function setupRealtimeListeners() {
    // Todos 리스너
    todosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.todos = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            state.todos = [];
        }
        state.isLoading = false;
        renderTodos();
        renderStats();
        renderCategories();
    });

    // Categories 리스너
    categoriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.categories = data;
        } else {
            // 기본 카테고리 설정
            state.categories = ['업무', '개인', '쇼핑', '기타'];
            categoriesRef.set(state.categories);
        }
        renderCategories();
        renderCategorySelects();
    });
}

// ========================================
// CRUD 기능 (Firebase)
// ========================================

function addTodo(todoData) {
    const todo = {
        title: todoData.title.trim(),
        completed: false,
        priority: todoData.priority || 'medium',
        dueDate: todoData.dueDate || null,
        category: todoData.category || state.categories[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    todosRef.push(todo)
        .catch(error => {
            console.error('할일 추가 실패:', error);
            alert('할일 추가에 실패했습니다. 다시 시도해주세요.');
        });
}

function updateTodo(id, updates) {
    const todoRef = database.ref(`todos/${id}`);
    todoRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
    }).catch(error => {
        console.error('할일 수정 실패:', error);
        alert('할일 수정에 실패했습니다. 다시 시도해주세요.');
    });
}

function deleteTodo(id) {
    const todoRef = database.ref(`todos/${id}`);
    todoRef.remove()
        .catch(error => {
            console.error('할일 삭제 실패:', error);
            alert('할일 삭제에 실패했습니다. 다시 시도해주세요.');
        });
}

function toggleComplete(id) {
    const todo = state.todos.find(t => t.id === id);
    if (todo) {
        updateTodo(id, { completed: !todo.completed });
    }
}

// ========================================
// 카테고리 관리 (Firebase)
// ========================================

function addCategory(name) {
    const trimmedName = name.trim();
    if (trimmedName && !state.categories.includes(trimmedName)) {
        const newCategories = [...state.categories, trimmedName];
        categoriesRef.set(newCategories)
            .catch(error => {
                console.error('카테고리 추가 실패:', error);
                alert('카테고리 추가에 실패했습니다.');
            });
    }
}

function deleteCategory(name) {
    if (state.categories.length <= 1) {
        alert('최소 하나의 카테고리가 필요합니다.');
        return;
    }

    // 해당 카테고리의 할일들을 첫 번째 카테고리로 이동
    const newCategory = state.categories.find(c => c !== name) || '기타';

    // 해당 카테고리의 todos 업데이트
    const todosToUpdate = state.todos.filter(todo => todo.category === name);
    const updatePromises = todosToUpdate.map(todo =>
        database.ref(`todos/${todo.id}`).update({ category: newCategory })
    );

    Promise.all(updatePromises)
        .then(() => {
            const newCategories = state.categories.filter(c => c !== name);
            if (state.currentFilter.category === name) {
                state.currentFilter.category = 'all';
            }
            return categoriesRef.set(newCategories);
        })
        .catch(error => {
            console.error('카테고리 삭제 실패:', error);
            alert('카테고리 삭제에 실패했습니다.');
        });
}

// ========================================
// 필터링 & 정렬
// ========================================

function filterTodos(todos) {
    return todos.filter(todo => {
        // 카테고리 필터
        if (state.currentFilter.category !== 'all' && todo.category !== state.currentFilter.category) {
            return false;
        }

        // 우선순위 필터
        if (state.currentFilter.priority !== 'all' && todo.priority !== state.currentFilter.priority) {
            return false;
        }

        // 상태 필터
        if (state.currentFilter.status === 'completed' && !todo.completed) {
            return false;
        }
        if (state.currentFilter.status === 'active' && todo.completed) {
            return false;
        }

        return true;
    });
}

function sortTodos(todos) {
    const sorted = [...todos];

    switch (state.currentSort) {
        case 'createdAt':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'dueDate':
            sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'priority':
            sorted.sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
            break;
    }

    return sorted;
}

// ========================================
// 렌더링
// ========================================

function renderTodos() {
    if (state.isLoading) {
        elements.todoList.innerHTML = '<div class="loading">데이터를 불러오는 중...</div>';
        elements.emptyState.classList.remove('show');
        return;
    }

    const filtered = filterTodos(state.todos);
    const sorted = sortTodos(filtered);

    if (sorted.length === 0) {
        elements.todoList.innerHTML = '';
        elements.emptyState.classList.add('show');
    } else {
        elements.emptyState.classList.remove('show');
        elements.todoList.innerHTML = sorted.map(todo => createTodoHTML(todo)).join('');
    }
}

function createTodoHTML(todo) {
    const dueDateClass = todo.dueDate
        ? (isOverdue(todo.dueDate) ? 'overdue' : (isDueSoon(todo.dueDate) ? 'soon' : ''))
        : '';

    return `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" data-priority="${todo.priority}" draggable="true">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="todo-content">
                <div class="todo-title">${escapeHTML(todo.title)}</div>
                <div class="todo-meta">
                    <span class="priority-badge ${todo.priority}">${getPriorityLabel(todo.priority)}</span>
                    ${todo.dueDate ? `<span class="due-date ${dueDateClass}">${formatDate(todo.dueDate)}</span>` : ''}
                    <span class="category">${escapeHTML(todo.category)}</span>
                </div>
            </div>
            <div class="todo-actions">
                <button class="edit-btn" title="수정">&#9998;</button>
                <button class="delete-btn" title="삭제">&#10005;</button>
            </div>
        </div>
    `;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderCategories() {
    const categoryCounts = {};
    state.categories.forEach(cat => {
        categoryCounts[cat] = state.todos.filter(t => t.category === cat).length;
    });

    const allCount = state.todos.length;

    let html = `
        <li class="category-item ${state.currentFilter.category === 'all' ? 'active' : ''}" data-category="all">
            <span class="category-name">전체</span>
            <span class="category-count">${allCount}</span>
        </li>
    `;

    state.categories.forEach(category => {
        html += `
            <li class="category-item ${state.currentFilter.category === category ? 'active' : ''}" data-category="${escapeHTML(category)}">
                <span class="category-name">${escapeHTML(category)}</span>
                <span class="category-count">${categoryCounts[category] || 0}</span>
                <button class="delete-category" title="카테고리 삭제">&times;</button>
            </li>
        `;
    });

    elements.categoryList.innerHTML = html;
}

function renderCategorySelects() {
    const options = state.categories.map(cat =>
        `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`
    ).join('');

    elements.todoCategory.innerHTML = options;
    elements.editCategory.innerHTML = options;
}

function renderStats() {
    const total = state.todos.length;
    const completed = state.todos.filter(t => t.completed).length;
    const pending = total - completed;

    elements.totalCount.textContent = total;
    elements.completedCount.textContent = completed;
    elements.pendingCount.textContent = pending;
}

// ========================================
// 모달 관리
// ========================================

function openEditModal(id) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    state.editingId = id;
    elements.editId.value = id;
    elements.editTitle.value = todo.title;
    elements.editPriority.value = todo.priority;
    elements.editDueDate.value = todo.dueDate || '';
    elements.editCategory.value = todo.category;

    elements.modalOverlay.classList.add('show');
}

function closeEditModal() {
    elements.modalOverlay.classList.remove('show');
    state.editingId = null;
    elements.editForm.reset();
}

function openDeleteModal(id) {
    state.deletingId = id;
    elements.deleteModalOverlay.classList.add('show');
}

function closeDeleteModal() {
    elements.deleteModalOverlay.classList.remove('show');
    state.deletingId = null;
}

// ========================================
// 이벤트 핸들러
// ========================================

function handleAddTodo(e) {
    e.preventDefault();

    const title = elements.todoTitle.value.trim();
    if (!title) return;

    addTodo({
        title,
        priority: elements.todoPriority.value,
        dueDate: elements.todoDueDate.value,
        category: elements.todoCategory.value
    });

    elements.addTodoForm.reset();
    elements.todoTitle.focus();
}

function handleEditSubmit(e) {
    e.preventDefault();

    if (!state.editingId) return;

    updateTodo(state.editingId, {
        title: elements.editTitle.value.trim(),
        priority: elements.editPriority.value,
        dueDate: elements.editDueDate.value || null,
        category: elements.editCategory.value
    });

    closeEditModal();
}

function handleTodoListClick(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem) return;

    const id = todoItem.dataset.id;

    // 체크박스 클릭
    if (e.target.classList.contains('todo-checkbox')) {
        toggleComplete(id);
        return;
    }

    // 수정 버튼 클릭
    if (e.target.classList.contains('edit-btn')) {
        openEditModal(id);
        return;
    }

    // 삭제 버튼 클릭
    if (e.target.classList.contains('delete-btn')) {
        openDeleteModal(id);
        return;
    }
}

function handleCategoryListClick(e) {
    const categoryItem = e.target.closest('.category-item');
    if (!categoryItem) return;

    // 삭제 버튼 클릭
    if (e.target.classList.contains('delete-category')) {
        e.stopPropagation();
        const category = categoryItem.dataset.category;
        if (category !== 'all') {
            deleteCategory(category);
        }
        return;
    }

    // 카테고리 선택
    const category = categoryItem.dataset.category;
    state.currentFilter.category = category;
    renderCategories();
    renderTodos();
}

function handleAddCategory() {
    const name = elements.newCategoryInput.value.trim();
    if (name) {
        addCategory(name);
        elements.newCategoryInput.value = '';
    }
}

function handleFilterChange() {
    state.currentFilter.priority = elements.filterPriority.value;
    state.currentFilter.status = elements.filterStatus.value;
    renderTodos();
}

function handleSortChange() {
    state.currentSort = elements.sortBy.value;
    renderTodos();
}

function handleMobileMenu() {
    elements.sidebar.classList.toggle('show');
}

// ========================================
// 드래그 앤 드롭 핸들러
// ========================================

let draggedTodoId = null;

function handleDragStart(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem) return;

    draggedTodoId = todoItem.dataset.id;
    todoItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    const todoItem = e.target.closest('.todo-item');
    if (todoItem) {
        todoItem.classList.remove('dragging');
    }
    draggedTodoId = null;

    // 모든 카테고리에서 drag-over 클래스 제거
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleCategoryDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleCategoryDragEnter(e) {
    const categoryItem = e.target.closest('.category-item');
    if (categoryItem && categoryItem.dataset.category !== 'all') {
        categoryItem.classList.add('drag-over');
    }
}

function handleCategoryDragLeave(e) {
    const categoryItem = e.target.closest('.category-item');
    if (categoryItem) {
        // relatedTarget이 같은 카테고리 아이템 내부인지 확인
        const relatedTarget = e.relatedTarget;
        if (!categoryItem.contains(relatedTarget)) {
            categoryItem.classList.remove('drag-over');
        }
    }
}

function handleCategoryDrop(e) {
    e.preventDefault();

    const categoryItem = e.target.closest('.category-item');
    if (!categoryItem || !draggedTodoId) return;

    const newCategory = categoryItem.dataset.category;

    // "전체" 카테고리에는 드롭 불가
    if (newCategory === 'all') return;

    // 카테고리 변경
    updateTodo(draggedTodoId, { category: newCategory });

    // drag-over 클래스 제거
    categoryItem.classList.remove('drag-over');
    draggedTodoId = null;
}

// ========================================
// 이벤트 바인딩
// ========================================

function bindEventListeners() {
    // 할일 추가 폼
    elements.addTodoForm.addEventListener('submit', handleAddTodo);

    // 수정 폼
    elements.editForm.addEventListener('submit', handleEditSubmit);

    // 모달 닫기
    elements.modalClose.addEventListener('click', closeEditModal);
    elements.btnCancel.addEventListener('click', closeEditModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeEditModal();
    });

    // 삭제 모달
    elements.deleteCancel.addEventListener('click', closeDeleteModal);
    elements.deleteConfirm.addEventListener('click', () => {
        if (state.deletingId) {
            deleteTodo(state.deletingId);
            closeDeleteModal();
        }
    });
    elements.deleteModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.deleteModalOverlay) closeDeleteModal();
    });

    // Todo 리스트 (이벤트 위임)
    elements.todoList.addEventListener('click', handleTodoListClick);

    // 드래그 앤 드롭 이벤트
    elements.todoList.addEventListener('dragstart', handleDragStart);
    elements.todoList.addEventListener('dragend', handleDragEnd);
    elements.categoryList.addEventListener('dragover', handleCategoryDragOver);
    elements.categoryList.addEventListener('dragenter', handleCategoryDragEnter);
    elements.categoryList.addEventListener('dragleave', handleCategoryDragLeave);
    elements.categoryList.addEventListener('drop', handleCategoryDrop);

    // 카테고리 리스트 (이벤트 위임)
    elements.categoryList.addEventListener('click', handleCategoryListClick);

    // 카테고리 추가
    elements.addCategoryBtn.addEventListener('click', handleAddCategory);
    elements.newCategoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCategory();
        }
    });

    // 필터 변경
    elements.filterPriority.addEventListener('change', handleFilterChange);
    elements.filterStatus.addEventListener('change', handleFilterChange);

    // 정렬 변경
    elements.sortBy.addEventListener('change', handleSortChange);

    // 모바일 메뉴
    elements.mobileMenuBtn.addEventListener('click', handleMobileMenu);

    // 테마 토글
    elements.themeToggle.addEventListener('click', toggleTheme);

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            closeDeleteModal();
        }
    });
}

// ========================================
// 초기화
// ========================================

function init() {
    // 테마 초기화
    initTheme();

    renderCategorySelects();
    renderCategories();
    renderTodos();
    renderStats();
    bindEventListeners();

    // Firebase 실시간 리스너 설정
    setupRealtimeListeners();
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', init);
