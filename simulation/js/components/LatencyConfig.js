// js/components/LatencyConfig.js

class LatencyConfig {
    constructor(containerId, scoreboard, onLatencyChange) {
        this.containerId = containerId;
        this.scoreboard = scoreboard;
        this.onLatencyChange = onLatencyChange;
    }

    render(readOnly = false) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Group instructions by category
        const categories = {
            'Memory Operations': [
                { type: INSTRUCTION_TYPES.LOAD, label: 'LD (Load)' },
                { type: INSTRUCTION_TYPES.STORE, label: 'SD (Store)' }
            ],
            'Integer Operations': [
                { type: INSTRUCTION_TYPES.INTEGER_ALU, label: 'DADD (Integer Add)' },
                { type: INSTRUCTION_TYPES.INTEGER_SUB, label: 'DSUB (Integer Subtract)' }
            ],
            'Floating-Point Operations': [
                { type: INSTRUCTION_TYPES.FP_ADD, label: 'ADDD (FP Add)' },
                { type: INSTRUCTION_TYPES.FP_SUB, label: 'SUBD (FP Subtract)' },
                { type: INSTRUCTION_TYPES.FP_MULT, label: 'MULTD (FP Multiply)' },
                { type: INSTRUCTION_TYPES.FP_DIV, label: 'DIVD (FP Divide)' }
            ],
            'Logical Operations': [
                { type: INSTRUCTION_TYPES.AND, label: 'AND (Bitwise AND)' },
                { type: INSTRUCTION_TYPES.OR, label: 'OR (Bitwise OR)' },
                { type: INSTRUCTION_TYPES.XOR, label: 'XOR (Bitwise XOR)' }
            ]
        };

        let html = '<div class="latency-config-container">';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

        // Render each category
        for (const [categoryName, instructions] of Object.entries(categories)) {
            html += `
                <div class="latency-category">
                    <h3 class="text-sm font-semibold text-gray-800 mb-3">${categoryName}</h3>
            `;

            for (const { type, label } of instructions) {
                const currentLatency = this.scoreboard.executionCycles[type];
                html += `
                    <div class="latency-item flex items-center justify-between">
                        <label for="latency-${type}" class="text-sm font-medium text-gray-700 flex-1">
                            ${label}
                        </label>
                        <div class="flex items-center gap-2">
                            <input 
                                type="number" 
                                id="latency-${type}" 
                                class="latency-input w-20 px-2 py-1 border border-gray-300 rounded text-center ${readOnly ? 'latency-input-readonly' : ''}"
                                value="${currentLatency}"
                                min="1"
                                max="100"
                                data-instruction-type="${type}"
                                ${readOnly ? 'readonly' : ''}
                            />
                            <span class="text-xs text-gray-500">cycles</span>
                        </div>
                    </div>
                `;
            }

            html += '</div>'; // Close category
        }

        html += '</div>'; // Close grid

        // Add info message based on mode
        if (readOnly) {
            html += `
                <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p class="text-sm text-yellow-800">
                        <strong>ℹ️ Read-Only Mode:</strong> Latencies cannot be changed during simulation. 
                        To modify latencies, stop the simulation and return to edit mode.
                    </p>
                </div>
            `;
        } else {
            html += `
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p class="text-sm text-blue-800">
                        <strong>💡 Tip:</strong> Configure the execution latencies for each instruction type. 
                        These values determine how many cycles each operation takes to execute.
                    </p>
                </div>
            `;
        }

        html += '</div>'; // Close container

        container.innerHTML = html;

        // Add event listeners to all inputs only if not read-only
        if (!readOnly) {
            this.attachEventListeners();
        }
    }

    attachEventListeners() {
        const inputs = document.querySelectorAll('.latency-input');
        
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const instructionType = e.target.dataset.instructionType;
                const newLatency = parseInt(e.target.value);
                
                // Update the scoreboard
                const result = this.scoreboard.updateLatency(instructionType, newLatency);
                
                // Notify parent component
                if (this.onLatencyChange) {
                    this.onLatencyChange(result);
                }
                
                // Re-render to show updated values
                this.render(false);
            });
        });
    }

    updateDisplay() {
        // Re-render without changing mode
        this.render(false);
    }
}

