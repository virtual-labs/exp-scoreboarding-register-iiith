// js/components/InstructionBuilder.js

class InstructionBuilder {
    constructor(containerId, scoreboard, onInstructionAdded) {
        this.container = document.getElementById(containerId);
        this.scoreboard = scoreboard;
        this.onInstructionAdded = onInstructionAdded;
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Instruction Type</label>
                    <select id="instruction-type" class="w-full p-2 border rounded">
                        ${Object.values(INSTRUCTION_TYPES).map(type => 
                            `<option value="${type}">${type}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <!-- Dynamic fields will be rendered here -->
                <div id="dynamic-fields" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                </div>
            </div>
            
            <div class="mt-4 flex justify-between">
                <div id="instruction-error" class="text-red-500"></div>
                <button id="add-instruction-btn" class="btn btn-primary">Add Instruction</button>
            </div>
        `;
    }

    updateFormFields(type) {
        const dynamicFieldsContainer = document.getElementById('dynamic-fields');
        
        // Clear previous fields
        dynamicFieldsContainer.innerHTML = '';
        
        if (type === INSTRUCTION_TYPES.LOAD) {
            // For load instructions: dest register, base register, offset
            dynamicFieldsContainer.innerHTML = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Destination Register</label>
                    <select id="dest-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${FP_REGISTERS.map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Base Address Register</label>
                    <select id="base-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${INT_REGISTERS.map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Offset</label>
                    <input type="number" id="offset" class="w-full p-2 border rounded" placeholder="e.g., 34">
                </div>
            `;
        } else if (type === INSTRUCTION_TYPES.STORE) {
            // For store instructions: src register (value to store), base register, offset
            dynamicFieldsContainer.innerHTML = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Value Register (to store)</label>
                    <select id="value-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${FP_REGISTERS.map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Base Address Register</label>
                    <select id="base-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${INT_REGISTERS.map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Offset</label>
                    <input type="number" id="offset" class="w-full p-2 border rounded" placeholder="e.g., 34">
                </div>
            `;
        } else {
            // For ALU instructions: dest register, src1, src2
            dynamicFieldsContainer.innerHTML = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Destination Register</label>
                    <select id="dest-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${FP_REGISTERS.map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Source Register 1</label>
                    <select id="src1-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${[...FP_REGISTERS, ...INT_REGISTERS].map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Source Register 2</label>
                    <select id="src2-register" class="w-full p-2 border rounded">
                        <option value="">Select register</option>
                        ${[...FP_REGISTERS, ...INT_REGISTERS].map(reg => 
                            `<option value="${reg}">${reg}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
    }

    setupEventListeners() {
        const typeSelect = document.getElementById('instruction-type');
        
        // Handle instruction type change to update form fields visibility/requirements
        typeSelect.addEventListener('change', () => {
            const type = typeSelect.value;
            this.updateFormFields(type);
        });
        
        // Trigger initial form setup
        this.updateFormFields(typeSelect.value);
        
        // Handle form submission
        this.container.addEventListener('click', (e) => {
            if (e.target.id === 'add-instruction-btn') {
                this.handleAddInstruction();
            }
        });
    }
    
    handleAddInstruction() {
        const type = document.getElementById('instruction-type').value;
        const errorElement = document.getElementById('instruction-error');
        
        let instruction = { type };
        
        // Get values based on instruction type
        if (type === INSTRUCTION_TYPES.LOAD) {
            const destRegister = document.getElementById('dest-register').value;
            const baseRegister = document.getElementById('base-register').value;
            const offset = document.getElementById('offset').value;
            
            if (!destRegister) {
                errorElement.textContent = "Please select a destination register";
                return;
            }
            
            if (!baseRegister) {
                errorElement.textContent = "Please select a base address register";
                return;
            }
            
            if (!offset) {
                errorElement.textContent = "Please enter an offset value";
                return;
            }
            
            instruction.dest = destRegister;
            instruction.src1 = baseRegister;
            instruction.src2 = null;
            instruction.offset = offset;
            
        } else if (type === INSTRUCTION_TYPES.STORE) {
            const valueRegister = document.getElementById('value-register').value;
            const baseRegister = document.getElementById('base-register').value;
            const offset = document.getElementById('offset').value;
            
            if (!valueRegister) {
                errorElement.textContent = "Please select a value register to store";
                return;
            }
            
            if (!baseRegister) {
                errorElement.textContent = "Please select a base address register";
                return;
            }
            
            if (!offset) {
                errorElement.textContent = "Please enter an offset value";
                return;
            }
            
            instruction.dest = null;
            instruction.src1 = baseRegister;
            instruction.src2 = valueRegister;
            instruction.offset = offset;
            
        } else {
            // ALU instructions
            const destRegister = document.getElementById('dest-register').value;
            const src1Register = document.getElementById('src1-register').value;
            const src2Register = document.getElementById('src2-register').value;
            
            if (!destRegister) {
                errorElement.textContent = "Please select a destination register";
                return;
            }
            
            if (!src1Register) {
                errorElement.textContent = "Please select source register 1";
                return;
            }
            
            if (!src2Register) {
                errorElement.textContent = "Please select source register 2";
                return;
            }
            
            instruction.dest = destRegister;
            instruction.src1 = src1Register;
            instruction.src2 = src2Register;
            instruction.offset = null;
        }
        
        // Clear error message
        errorElement.textContent = '';
        
        // Add instruction to scoreboard
        const instructionIndex = this.scoreboard.addInstruction(instruction);
        
        // Clear form fields
        this.updateFormFields(type);
        
        // Notify parent component
        if (this.onInstructionAdded) {
            this.onInstructionAdded(instructionIndex);
        }
    }
}