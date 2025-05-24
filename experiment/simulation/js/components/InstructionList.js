// js/components/InstructionList.js

class InstructionList {
    constructor(containerId, scoreboard, onInstructionRemoved, onInstructionsReordered) {
        this.container = document.getElementById(containerId);
        this.scoreboard = scoreboard;
        this.onInstructionRemoved = onInstructionRemoved;
        this.onInstructionsReordered = onInstructionsReordered;
        this.render();
    }

    render() {
        if (this.scoreboard.instructions.length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    No instructions added yet. Use the form below to add instructions.
                </div>
            `;
            return;
        }

        let listHTML = `
            <div class="mb-2 text-sm text-gray-600">Drag to reorder instructions:</div>
            <ul class="space-y-2" id="instruction-list-items">
        `;

        this.scoreboard.instructions.forEach((instruction, index) => {
            listHTML += `
                <li class="bg-white p-3 rounded-lg shadow flex justify-between items-center cursor-move" 
                    data-index="${index}" draggable="true">
                    <span class="font-mono">${this.formatInstruction(instruction)}</span>
                    <button class="text-red-500 hover:text-red-700" data-remove="${index}">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </li>
            `;
        });

        listHTML += `</ul>`;
        this.container.innerHTML = listHTML;
        
        this.setupDragAndDrop();
        this.setupRemoveButtons();
    }

    setupDragAndDrop() {
        const items = document.querySelectorAll('#instruction-list-items > li');
        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', function() {
                draggedItem = this;
                setTimeout(() => this.classList.add('opacity-50'), 0);
            });

            item.addEventListener('dragend', function() {
                this.classList.remove('opacity-50');
                draggedItem = null;
            });

            item.addEventListener('dragover', function(e) {
                e.preventDefault();
            });

            item.addEventListener('dragenter', function() {
                if (this !== draggedItem) {
                    this.classList.add('bg-blue-50');
                }
            });

            item.addEventListener('dragleave', function() {
                this.classList.remove('bg-blue-50');
            });

            item.addEventListener('drop', e => {
                e.preventDefault();
                if (item !== draggedItem) {
                    const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
                    const toIndex = parseInt(item.getAttribute('data-index'));
                    
                    if (this.onInstructionsReordered) {
                        this.onInstructionsReordered(fromIndex, toIndex);
                    }
                }
                item.classList.remove('bg-blue-50');
            });
        });
    }

    setupRemoveButtons() {
        const removeButtons = this.container.querySelectorAll('button[data-remove]');
        removeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-remove'));
                if (this.onInstructionRemoved) {
                    this.onInstructionRemoved(index);
                }
            });
        });
    }

    formatInstruction(instruction) {
        if (instruction.type === INSTRUCTION_TYPES.LOAD) {
            return `${instruction.type} ${instruction.dest}, ${instruction.offset}(${instruction.src1})`;
        } else if (instruction.type === INSTRUCTION_TYPES.STORE) {
            return `${instruction.type} ${instruction.src2}, ${instruction.offset}(${instruction.src1})`;
        } else {
            // ALU instructions
            return `${instruction.type} ${instruction.dest}, ${instruction.src1}, ${instruction.src2 || ''}`;
        }
    }
}