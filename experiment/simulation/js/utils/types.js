// js/utils/types.js

// Instruction types
const INSTRUCTION_TYPES = {
    LOAD: "LD",
    STORE: "SD",
    INTEGER_ALU: "DADD",
    INTEGER_SUB: "DSUB",
    FP_ADD: "ADDD",
    FP_SUB: "SUBD",
    FP_MULT: "MULTD",
    FP_DIV: "DIVD",
    AND: "AND",
    OR: "OR",
    XOR: "XOR"
};

// Functional unit types
const FUNCTIONAL_UNITS = {
    INTEGER1: "Integer1",
    INTEGER2: "Integer2",
    FP_ADDER: "FP Adder",
    FP_MULTIPLIER: "FP Multiplier",
    FP_DIVIDER: "FP Divider"
};

// Instruction status stages
const INSTRUCTION_STAGES = {
    ISSUE: "Issue",
    READ_OPERANDS: "Read Operands",
    EXECUTION_COMPLETE: "Execution Complete",
    WRITE_RESULT: "Write Result"
};

// Default execution cycles for each instruction type
const DEFAULT_EXECUTION_CYCLES = {
    [INSTRUCTION_TYPES.LOAD]: 1,
    [INSTRUCTION_TYPES.STORE]: 1,
    [INSTRUCTION_TYPES.INTEGER_ALU]: 1,
    [INSTRUCTION_TYPES.INTEGER_SUB]: 1,
    [INSTRUCTION_TYPES.FP_ADD]: 2,
    [INSTRUCTION_TYPES.FP_SUB]: 2,
    [INSTRUCTION_TYPES.FP_MULT]: 10,
    [INSTRUCTION_TYPES.FP_DIV]: 40,
    [INSTRUCTION_TYPES.AND]: 1,
    [INSTRUCTION_TYPES.OR]: 1,
    [INSTRUCTION_TYPES.XOR]: 1
};

// Mapping between instruction types and functional units (with preference for first available)
const INSTRUCTION_TO_FUNCTIONAL_UNIT = {
    [INSTRUCTION_TYPES.LOAD]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2],
    [INSTRUCTION_TYPES.STORE]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2],
    [INSTRUCTION_TYPES.INTEGER_ALU]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2],
    [INSTRUCTION_TYPES.INTEGER_SUB]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2],
    [INSTRUCTION_TYPES.FP_ADD]: [FUNCTIONAL_UNITS.FP_ADDER],
    [INSTRUCTION_TYPES.FP_SUB]: [FUNCTIONAL_UNITS.FP_ADDER],
    [INSTRUCTION_TYPES.FP_MULT]: [FUNCTIONAL_UNITS.FP_MULTIPLIER],
    [INSTRUCTION_TYPES.FP_DIV]: [FUNCTIONAL_UNITS.FP_DIVIDER],
    [INSTRUCTION_TYPES.AND]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2],
    [INSTRUCTION_TYPES.OR]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2],
    [INSTRUCTION_TYPES.XOR]: [FUNCTIONAL_UNITS.INTEGER1, FUNCTIONAL_UNITS.INTEGER2]
};

// Generate FP registers F0-F15 (reduced from 32 to 16)
const FP_REGISTERS = Array.from({ length: 16 }, (_, i) => `F${i}`);

// Generate integer registers R0-R15 (reduced from 32 to 16)
const INT_REGISTERS = Array.from({ length: 16 }, (_, i) => `R${i}`);

// Generate physical registers P0-P63 (64 total)
const PHYSICAL_REGISTERS = Array.from({ length: 64 }, (_, i) => `P${i}`);

// Physical register status
const PHYS_REG_STATUS = {
    FREE: 'free',
    BUSY: 'busy',
    READY: 'ready'
};

// Initialize default functional units (2 integer, 1 each of FP units)
const DEFAULT_FUNCTIONAL_UNITS = [
    {
        name: FUNCTIONAL_UNITS.INTEGER1,
        busy: false,
        op: null,
        fi: null,
        fj: null,
        fk: null,
        qj: null,
        qk: null,
        rj: true,
        rk: true,
        cyclesRemaining: 0
    },
    {
        name: FUNCTIONAL_UNITS.INTEGER2,
        busy: false,
        op: null,
        fi: null,
        fj: null,
        fk: null,
        qj: null,
        qk: null,
        rj: true,
        rk: true,
        cyclesRemaining: 0
    },
    {
        name: FUNCTIONAL_UNITS.FP_ADDER,
        busy: false,
        op: null,
        fi: null,
        fj: null,
        fk: null,
        qj: null,
        qk: null,
        rj: true,
        rk: true,
        cyclesRemaining: 0
    },
    {
        name: FUNCTIONAL_UNITS.FP_MULTIPLIER,
        busy: false,
        op: null,
        fi: null,
        fj: null,
        fk: null,
        qj: null,
        qk: null,
        rj: true,
        rk: true,
        cyclesRemaining: 0
    },
    {
        name: FUNCTIONAL_UNITS.FP_DIVIDER,
        busy: false,
        op: null,
        fi: null,
        fj: null,
        fk: null,
        qj: null,
        qk: null,
        rj: true,
        rk: true,
        cyclesRemaining: 0
    }
];

// Initialize default rename table (architectural -> physical register mapping)
function createDefaultRenameTable() {
    const renameTable = {};
    
    // Map FP registers F0-F15 to P0-P15 initially
    FP_REGISTERS.forEach((reg, index) => {
        renameTable[reg] = `P${index}`;
    });
    
    // Map integer registers R0-R15 to P16-P31 initially
    INT_REGISTERS.forEach((reg, index) => {
        renameTable[reg] = `P${index + 16}`;
    });
    
    return renameTable;
}

// Initialize physical register file
function createInitialPhysicalRegisterFile() {
    const physicalRegs = {};
    
    PHYSICAL_REGISTERS.forEach((reg, index) => {
        if (index < 32) {
            // First 32 registers (P0-P31) are initially ready
            // P0-P15 correspond to initial FP registers
            // P16-P31 correspond to initial integer registers
            physicalRegs[reg] = {
                status: PHYS_REG_STATUS.READY,
                value: null,
                instructionIndex: null,
                architecturalReg: null,
                readerCount: 0,
                writerCompleted: true,
                orphaned: false
            };
        } else {
            // Last 32 registers (P32-P63) start as free
            physicalRegs[reg] = {
                status: PHYS_REG_STATUS.FREE,
                value: null,
                instructionIndex: null,
                architecturalReg: null,
                readerCount: 0,
                writerCompleted: false,
                orphaned: true
            };
        }
    });
    
    return physicalRegs;
}

// Initialize register result status (now tracks which functional unit will write to each physical register)
function createDefaultRegisterStatus() {
    const status = {};
    
    // Initialize all physical registers with null (no functional unit will write to them initially)
    PHYSICAL_REGISTERS.forEach(register => {
        status[register] = null;
    });
    
    return status;
}