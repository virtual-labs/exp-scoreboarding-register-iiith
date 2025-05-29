// js/components/RenameTable.js

class RenameTable {
    constructor(containerId, scoreboard) {
        this.container = document.getElementById(containerId);
        this.scoreboard = scoreboard;
        this.render();
    }

    render() {
        let tableHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- FP Registers Table -->
                <div>
                    <h3 class="text-lg font-semibold mb-3">Floating-Point Registers</h3>
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="w-1/2">Architectural Register</th>
                                <th class="w-1/2">Physical Register</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Display FP register mappings
        FP_REGISTERS.forEach(archReg => {
            const physReg = this.scoreboard.renameTable[archReg];
            const isChanged = this.hasRegisterChanged(archReg, physReg);
            const rowClass = isChanged ? 'bg-yellow-50' : '';
            
            tableHTML += `
                <tr class="${rowClass}">
                    <td class="text-center font-mono">${archReg}</td>
                    <td class="text-center font-mono font-semibold ${this.getPhysicalRegisterClass(physReg)}">
                        ${physReg}
                        ${this.getRegisterStatusIcon(physReg)}
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                        </tbody>
                    </table>
                </div>

                <!-- Integer Registers Table -->
                <div>
                    <h3 class="text-lg font-semibold mb-3">Integer Registers</h3>
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="w-1/2">Architectural Register</th>
                                <th class="w-1/2">Physical Register</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Display integer register mappings
        INT_REGISTERS.forEach(archReg => {
            const physReg = this.scoreboard.renameTable[archReg];
            const isChanged = this.hasRegisterChanged(archReg, physReg);
            const rowClass = isChanged ? 'bg-yellow-50' : '';
            
            tableHTML += `
                <tr class="${rowClass}">
                    <td class="text-center font-mono">${archReg}</td>
                    <td class="text-center font-mono font-semibold ${this.getPhysicalRegisterClass(physReg)}">
                        ${physReg}
                        ${this.getRegisterStatusIcon(physReg)}
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Legend -->
            <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 class="font-semibold mb-2">Legend:</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div class="flex items-center">
                        <span class="w-3 h-3 bg-yellow-50 border mr-2"></span>
                        Recently renamed
                    </div>
                    <div class="flex items-center">
                        <span class="w-3 h-3 bg-green-100 mr-2"></span>
                        <span class="text-green-600">Ready</span>
                    </div>
                    <div class="flex items-center">
                        <span class="w-3 h-3 bg-blue-100 mr-2"></span>
                        <span class="text-blue-600">Busy (being written)</span>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = tableHTML;
    }

    // Check if a register mapping has changed from its initial value
    hasRegisterChanged(archReg, physReg) {
        // Get the initial mapping for this architectural register
        const fpIndex = FP_REGISTERS.indexOf(archReg);
        if (fpIndex !== -1) {
            // FP registers F0-F15 initially map to P0-P15
            return physReg !== `P${fpIndex}`;
        }
        
        const intIndex = INT_REGISTERS.indexOf(archReg);
        if (intIndex !== -1) {
            // Integer registers R0-R15 initially map to P16-P31
            return physReg !== `P${intIndex + 16}`;
        }
        
        return false;
    }

    // Get CSS class for physical register based on its status
    getPhysicalRegisterClass(physReg) {
        const physRegInfo = this.scoreboard.physicalRegisters[physReg];
        if (!physRegInfo) {
            return 'text-gray-500';
        }

        switch (physRegInfo.status) {
            case PHYS_REG_STATUS.READY:
                return 'text-green-600';
            case PHYS_REG_STATUS.BUSY:
                return 'text-blue-600';
            case PHYS_REG_STATUS.FREE:
                return 'text-red-600';
            default:
                return 'text-gray-500';
        }
    }

    // Get status icon for physical register
    getRegisterStatusIcon(physReg) {
        const physRegInfo = this.scoreboard.physicalRegisters[physReg];
        if (!physRegInfo) {
            return '';
        }

        const instructionIndex = physRegInfo.instructionIndex;
        let tooltip = '';

        switch (physRegInfo.status) {
            case PHYS_REG_STATUS.READY:
                tooltip = 'Ready for use';
                return `<span class="ml-1 text-xs" title="${tooltip}">✓</span>`;
            case PHYS_REG_STATUS.BUSY:
                if (instructionIndex !== null) {
                    const instruction = this.scoreboard.instructions[instructionIndex];
                    tooltip = `Being written by instruction ${instructionIndex + 1} (${instruction ? instruction.type : 'unknown'})`;
                } else {
                    tooltip = 'Being written';
                }
                return `<span class="ml-1 text-xs" title="${tooltip}">⏳</span>`;
            case PHYS_REG_STATUS.FREE:
                tooltip = 'Available for reuse';
                return `<span class="ml-1 text-xs" title="${tooltip}">♻</span>`;
            default:
                return '';
        }
    }
}