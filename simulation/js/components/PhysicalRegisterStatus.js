// js/components/PhysicalRegisterStatus.js

class PhysicalRegisterStatus {
    constructor(containerId, scoreboard) {
        this.container = document.getElementById(containerId);
        this.scoreboard = scoreboard;
        this.render();
    }

    render() {
        // Calculate statistics
        const stats = this.calculateStats();
        
        let statusHTML = `
            <!-- Statistics Summary -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600">${stats.ready}</div>
                    <div class="text-sm text-green-800">Ready</div>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-600">${stats.busy}</div>
                    <div class="text-sm text-blue-800">Busy</div>
                </div>
                <div class="bg-red-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-red-600">${stats.free}</div>
                    <div class="text-sm text-red-800">Freed</div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-gray-600">${stats.total}</div>
                    <div class="text-sm text-gray-800">Total Allocated</div>
                </div>
            </div>

            <!-- Physical Register Grid -->
            <h3 class="text-lg font-semibold mb-3">Physical Register File (All 64 Registers)</h3>
            <div class="grid grid-cols-8 md:grid-cols-16 gap-1 mb-4">
        `;

        // Show all 64 physical registers
        for (let i = 0; i < 64; i++) {
            const physReg = `P${i}`;
            const regInfo = this.scoreboard.physicalRegisters[physReg];
            statusHTML += this.renderRegisterCell(physReg, regInfo);
        }
        
        // Also show any additional registers beyond P63 if they exist
        for (let i = 64; i < this.scoreboard.nextPhysicalRegister; i++) {
            const physReg = `P${i}`;
            const regInfo = this.scoreboard.physicalRegisters[physReg];
            statusHTML += this.renderRegisterCell(physReg, regInfo);
        }

        statusHTML += `
            </div>

            <!-- Active Instructions Summary -->
            <div class="mt-4 bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold mb-2">Active Instructions Using Physical Registers:</h4>
                <div class="text-sm">
                    ${this.renderActiveInstructions()}
                </div>
            </div>

            <!-- Legend -->
            <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 class="font-semibold mb-2">Physical Register Status Legend:</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div class="flex items-center">
                        <span class="w-4 h-4 bg-green-100 border border-green-300 mr-2"></span>
                        Ready (available for reading)
                    </div>
                    <div class="flex items-center">
                        <span class="w-4 h-4 bg-blue-100 border border-blue-300 mr-2"></span>
                        Busy (being written to)
                    </div>
                    <div class="flex items-center">
                        <span class="w-4 h-4 bg-red-100 border border-red-300 mr-2"></span>
                        Freed (available for reallocation)
                    </div>
                    <div class="flex items-center">
                        <span class="mr-2">📖</span>
                        Has active readers
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = statusHTML;
    }

    renderRegisterCell(physReg, regInfo) {
        if (!regInfo) {
            return `
                <div class="w-12 h-12 border border-gray-300 rounded flex items-center justify-center bg-gray-100 text-xs text-gray-400">
                    ${physReg}
                </div>
            `;
        }

        const { cssClass, bgClass, borderClass } = this.getRegisterClasses(regInfo.status);
        const tooltip = this.getRegisterTooltip(physReg, regInfo);
        const readerIndicator = regInfo.readerCount > 0 ? `📖${regInfo.readerCount}` : '';

        return `
            <div class="w-12 h-12 border ${borderClass} rounded flex flex-col items-center justify-center ${bgClass} text-xs cursor-help" 
                 title="${tooltip}">
                <div class="font-mono text-xs ${cssClass}">${physReg}</div>
                <div class="text-xs ${cssClass}">${this.getStatusSymbol(regInfo.status)}</div>
                ${readerIndicator ? `<div class="text-xs">${readerIndicator}</div>` : ''}
            </div>
        `;
    }

    getRegisterClasses(status) {
        switch (status) {
            case PHYS_REG_STATUS.READY:
                return {
                    cssClass: 'text-green-800',
                    bgClass: 'bg-green-100',
                    borderClass: 'border-green-300'
                };
            case PHYS_REG_STATUS.BUSY:
                return {
                    cssClass: 'text-blue-800',
                    bgClass: 'bg-blue-100',
                    borderClass: 'border-blue-300'
                };
            case PHYS_REG_STATUS.FREE:
                return {
                    cssClass: 'text-red-800',
                    bgClass: 'bg-red-100',
                    borderClass: 'border-red-300'
                };
            default:
                return {
                    cssClass: 'text-gray-600',
                    bgClass: 'bg-gray-100',
                    borderClass: 'border-gray-300'
                };
        }
    }

    getStatusSymbol(status) {
        switch (status) {
            case PHYS_REG_STATUS.READY:
                return '✓';
            case PHYS_REG_STATUS.BUSY:
                return '⏳';
            case PHYS_REG_STATUS.FREE:
                return '♻';
            default:
                return '';
        }
    }

    getRegisterTooltip(physReg, regInfo) {
        let tooltip = `${physReg}: ${regInfo.status}`;
        
        if (regInfo.readerCount > 0) {
            tooltip += `, ${regInfo.readerCount} reader(s)`;
        }
        
        if (!regInfo.writerCompleted && regInfo.status === PHYS_REG_STATUS.BUSY) {
            tooltip += `, writer not completed`;
        }
        
        if (regInfo.instructionIndex !== null) {
            const instruction = this.scoreboard.instructions[regInfo.instructionIndex];
            tooltip += ` (Instruction ${regInfo.instructionIndex + 1}: ${instruction ? instruction.type : 'unknown'})`;
        }
        
        if (regInfo.architecturalReg) {
            tooltip += ` (Maps to ${regInfo.architecturalReg})`;
        }
        
        return tooltip;
    }

    calculateStats() {
        let ready = 0, busy = 0, free = 0;
        
        // Calculate stats for all 64 registers plus any additional allocated ones
        const totalRegisters = Math.max(64, this.scoreboard.nextPhysicalRegister);
        
        for (let i = 0; i < totalRegisters; i++) {
            const physReg = `P${i}`;
            const regInfo = this.scoreboard.physicalRegisters[physReg];
            
            if (regInfo) {
                switch (regInfo.status) {
                    case PHYS_REG_STATUS.READY:
                        ready++;
                        break;
                    case PHYS_REG_STATUS.BUSY:
                        busy++;
                        break;
                    case PHYS_REG_STATUS.FREE:
                        free++;
                        break;
                }
            }
        }
        
        return {
            ready,
            busy,
            free,
            total: totalRegisters
        };
    }

    renderActiveInstructions() {
        const activeInstructions = this.scoreboard.instructions.filter(instr => 
            instr.status[INSTRUCTION_STAGES.ISSUE] !== null && 
            instr.status[INSTRUCTION_STAGES.WRITE_RESULT] === null
        );

        if (activeInstructions.length === 0) {
            return '<span class="text-gray-500">No active instructions using physical registers</span>';
        }

        return activeInstructions.map((instr, idx) => {
            const instructionIndex = this.scoreboard.instructions.indexOf(instr);
            const physRegs = [];
            
            if (instr.physDest) physRegs.push(`${instr.dest}→${instr.physDest}`);
            if (instr.physSrc1) physRegs.push(`${instr.src1}→${instr.physSrc1}`);
            if (instr.physSrc2) physRegs.push(`${instr.src2}→${instr.physSrc2}`);
            
            return `
                <div class="mb-1">
                    <span class="font-semibold">Instruction ${instructionIndex + 1}</span> (${instr.type}): 
                    ${physRegs.join(', ')}
                </div>
            `;
        }).join('');
    }
}