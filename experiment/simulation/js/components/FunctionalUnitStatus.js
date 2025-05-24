// js/components/FunctionalUnitStatus.js

class FunctionalUnitStatus {
    constructor(containerId, scoreboard) {
        this.container = document.getElementById(containerId);
        this.scoreboard = scoreboard;
        this.render();
    }

    render() {
        let tableHTML = `
            <table class="w-full">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Busy</th>
                        <th>Op</th>
                        <th>Fi (Physical)</th>
                        <th>Fj (Physical)</th>
                        <th>Fk (Physical)</th>
                        <th>Qj</th>
                        <th>Qk</th>
                        <th>Rj</th>
                        <th>Rk</th>
                        <th>Cycles Remaining</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.scoreboard.functionalUnits.forEach(unit => {
            // Determine the CSS class for the cycles column based on value
            let cyclesClass = '';
            if (unit.busy) {
                if (unit.cyclesRemaining > 5) {
                    cyclesClass = 'cycles-high';
                } else if (unit.cyclesRemaining > 2) {
                    cyclesClass = 'cycles-medium';
                } else {
                    cyclesClass = 'cycles-low';
                }
            }

            // Get architectural register mappings for better display
            const archInfo = this.getArchitecturalInfo(unit);
            
            tableHTML += `
                <tr>
                    <td>${unit.name}</td>
                    <td>${unit.busy ? 'Yes' : 'No'}</td>
                    <td>${unit.op || ''}</td>
                    <td>${this.formatRegisterField(unit.fi, archInfo.dest)}</td>
                    <td>${this.formatRegisterField(unit.fj, archInfo.src1)}</td>
                    <td>${this.formatRegisterField(unit.fk, archInfo.src2)}</td>
                    <td>${unit.qj || ''}</td>
                    <td>${unit.qk || ''}</td>
                    <td>${unit.rj !== null ? (unit.rj ? 'Yes' : 'No') : ''}</td>
                    <td>${unit.rk !== null ? (unit.rk ? 'Yes' : 'No') : ''}</td>
                    <td class="${cyclesClass}">${unit.busy ? unit.cyclesRemaining : ''}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        this.container.innerHTML = tableHTML;
    }

    // Get architectural register information for a functional unit
    getArchitecturalInfo(unit) {
        if (!unit.busy) {
            return { dest: null, src1: null, src2: null };
        }

        // Find the instruction using this functional unit
        const instruction = this.scoreboard.instructions.find(instr => 
            instr.physDest === unit.fi && 
            instr.physSrc1 === unit.fj && 
            instr.physSrc2 === unit.fk &&
            instr.type === unit.op
        );

        if (instruction) {
            return {
                dest: instruction.dest,
                src1: instruction.src1,
                src2: instruction.src2
            };
        }

        return { dest: null, src1: null, src2: null };
    }

    // Format register field to show both physical and architectural registers
    formatRegisterField(physReg, archReg) {
        if (!physReg) {
            return '';
        }

        if (archReg) {
            return `<span class="font-mono">${physReg}</span><br><span class="text-xs text-gray-500">(${archReg})</span>`;
        } else {
            return `<span class="font-mono">${physReg}</span>`;
        }
    }
}