let inputField = document.querySelector("#prompt");
let chatContainer = document.querySelector(".chat-container");
let imageBtn = document.querySelector("#image");
let image = document.querySelector("#image img");
let imageInput = document.querySelector("#image input");
let submitBtn = document.querySelector("#submit");
let chatHistory = JSON.parse(localStorage.getItem("chatHistory"));
if (!Array.isArray(chatHistory)) {
    chatHistory = []; // Initialize as an empty array if it's invalid
}
let chatTabs = JSON.parse(localStorage.getItem("chatTabs")) || []; // Load chat tabs or initialize an empty array
let activeChatIndex = parseInt(localStorage.getItem("activeChatIndex")) || 0; // Default to 0 if invalid or undefined

const Api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDmpgzDC9CXunkwomrLi2JMGU5jOotIqxE";

let user = {
    message: null,
    file: {
        mime_type: null,
        data: null
    }
};

// Function to save chat history and tabs to local storage
function saveChatToLocalStorage() {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    localStorage.setItem("chatTabs", JSON.stringify(chatTabs));
    localStorage.setItem("activeChatIndex", activeChatIndex);
}

// Function to render chat tabs in the sidebar
function renderChatTabs() {
    const tabsContainer = document.querySelector(".tabs");
    tabsContainer.innerHTML = ''; // Clear existing tabs
    chatTabs.forEach((chat, index) => {
        const tabButton = document.createElement("button");
        tabButton.textContent = chat.name;
        tabButton.classList.add("tab");
        if (index == activeChatIndex) tabButton.classList.add("active");
        tabButton.dataset.index = index;

        // Create the "clear" button and append it to each tab
        const clearButton = document.createElement("button");
        clearButton.classList.add("clear-btn");
        clearButton.textContent = "Clear";
        clearButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent the tab click event
            clearChat(index);
        });

        tabButton.appendChild(clearButton);
        tabsContainer.appendChild(tabButton);
    });

    tabsContainer.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            activeChatIndex = e.target.dataset.index;
            renderChatHistory();
            renderChatTabs();
        });
    });
}

// Function to clear chat history and reload page
function clearChat(index) {
    // Remove the selected chat from history and tabs
    chatTabs.splice(index, 1);
    chatHistory.splice(index, 1);

    // Reset active chat index to 0 or adjust if the last tab was deleted
    activeChatIndex = 0;
    if (index < activeChatIndex) activeChatIndex--;

    // Save the updated chat history and tabs to localStorage
    saveChatToLocalStorage();

    // Reload the page to reflect changes
    location.reload();
}

// Function to render chat history for the active chat
function renderChatHistory() {
    chatContainer.innerHTML = ''; // Clear existing chat
    const activeChat = chatHistory[activeChatIndex];
    activeChat?.messages?.forEach(chat => {
        const html = chat.sender === "user"
            ? `<img src="user.jpg" alt="" id="userImage" width="7%">
                <div class="user-chat-area">
                    ${chat.message}
                    ${chat.file ? `<img src="data:${chat.file.mime_type};base64,${chat.file.data}" class="choose-img" />` : ""}
                </div>`
            : `<img src="ai.png" alt="" id="aiImage" width="10%">
                <div class="ai-chat-area">${chat.message}</div>`;
        const chatBox = createChatBox(html, chat.sender === "user" ? "user-chat-box" : "ai-chat-box");
        chatContainer.appendChild(chatBox);
    });
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
}

// Function to create a chat box for both AI and User
function createChatBox(html, classes) {
    let div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add(classes);
    return div;
}

// Function to handle new chat creation
document.getElementById("new-chat").addEventListener("click", () => {
    const chatName = prompt("Enter the name of your new chat:");
    if (chatName) {
        chatTabs.unshift({ name: chatName }); // Add new chat at the top
        chatHistory.unshift({ name: chatName, messages: [] }); // Initialize messages array for new chat
        activeChatIndex = 0; // Set the newly added chat as active
        saveChatToLocalStorage();
        renderChatTabs();
        renderChatHistory();
    }
});


// Handle chat response from user
function handleChatResponse() {
    // Make sure to update user.message before using it
    const userMessage = inputField.value.trim();
    if (!userMessage) return; // Don't proceed if the message is empty

    user.message = userMessage; // Set user.message to the value from inputField

    // Check if chatHistory has valid entries and activeChatIndex is valid
    if (!chatHistory[activeChatIndex]) {
        alert("No active chat selected.");
        return;
    }

    const activeChat = chatHistory[activeChatIndex];

    // Save user's message to the active chat's history
    activeChat.messages.push({
        sender: "user",
        message: user.message,
        file: user.file.data ? { mime_type: user.file.mime_type, data: user.file.data } : null
    });
    saveChatToLocalStorage();

    // User chat HTML
    let html = `<img src="user.jpg" alt="" id="userImage" width="7%">
                <div class="user-chat-area">
                    ${user.message}
                    ${user.file.data ? `<img src="data:${user.file.mime_type};base64,${user.file.data}" class="choose-img" />` : ""}
                </div>`;
    inputField.value = ""; // Clear the input field
    let userChatBox = createChatBox(html, "user-chat-box");
    chatContainer.appendChild(userChatBox);
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

    // AI Response
    setTimeout(() => {
        let html = `<img src="ai.png" alt="" id="aiImage" width="10%">
                    <div class="ai-chat-area"> 
                        <img src="loading.webp" alt="" class="load" width="50px"> 
                    </div>`;
        let aiChatBox = createChatBox(html, "ai-chat-box");
        chatContainer.appendChild(aiChatBox);
        generateResponse(aiChatBox);
    }, 600);
}


// Handle AI response from the API
async function generateResponse(aiChatBox) {
    let text = aiChatBox.querySelector(".ai-chat-area");

    let RequestOption = {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "contents": [
                { "parts": [{ "text": user.message }, (user.file.data ? [{ "inline_data": user.file }] : [])] }
            ]
        })
    };
    try {
        let response = await fetch(Api_url, RequestOption);
        let data = await response.json();
        let apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
        text.innerHTML = apiResponse;

        // Save AI response to chat history
        const activeChat = chatHistory[activeChatIndex];
        activeChat.messages.push({ sender: "bot", message: apiResponse, file: null });
        saveChatToLocalStorage();
    } catch (error) {
        console.log(error);
    } finally {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
        image.src = `img.svg`;
        image.classList.remove("prompt-img");
        user.file = {};
    }
}

// Event listeners for prompt input, file input, and submit button
inputField.addEventListener("keydown", (e) => {
    if (e.key == "Enter" && !e.shiftKey) {
        handleChatResponse();
    }
});

submitBtn.addEventListener("click", () => {
    handleChatResponse();
});

// Initialize chat tabs and history
renderChatTabs();
renderChatHistory();
