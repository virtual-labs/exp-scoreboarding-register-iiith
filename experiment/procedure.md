## Step 1: Build Your Instruction Sequence

Begin by constructing a sequence of instructions that will demonstrate register renaming and scoreboarding concepts. The simulator supports the following instruction types:

### Available Instructions

- **Memory Operations**:
  - `LD` (Load): Loads data from memory into a register
  - `SD` (Store): Stores data from a register to memory
  - Base address register must be an integer register (R0-R15)
  - Destination/source can be either integer (R0-R15) or floating-point (F0-F15) registers

- **Integer ALU Operations** (use only R0-R15):
  - `DADD`: Integer addition
  - `DSUB`: Integer subtraction
  - `AND`: Bitwise AND
  - `OR`: Bitwise OR
  - `XOR`: Bitwise XOR

- **Floating-Point Operations** (use only F0-F15):
  - `ADDD`: Double-precision floating-point addition
  - `SUBD`: Double-precision floating-point subtraction
  - `MULTD`: Double-precision floating-point multiplication
  - `DIVD`: Double-precision floating-point division

### Building Your Sequence

1. Select an instruction type from the dropdown menu
2. Choose appropriate registers based on the instruction type:
   - Integer instructions: Only R0-R15 available
   - FP instructions: Only F0-F15 available
   - Memory instructions: Can access both register files (with grouped dropdowns)
3. For memory operations, specify the base register (R0-R15 only) and offset value
4. Click "Add Instruction" to add it to your sequence
5. Reorder instructions by dragging them if needed
6. Remove unwanted instructions using the delete button

**Tip**: Try creating sequences with potential WAR and WAW hazards to see how register renaming eliminates them!

## Step 2: Configure Execution Latencies

Before starting the simulation, configure the execution latencies (number of cycles) for each instruction type. This allows you to experiment with different processor configurations:

- **Memory Operations**: LD and SD (typical: 1-2 cycles)
- **Integer Operations**: DADD, DSUB, AND, OR, XOR (typical: 1 cycle)
- **Floating-Point Operations**:
  - ADDD/SUBD (typical: 2 cycles)
  - MULTD (typical: 10 cycles)
  - DIVD (typical: 40 cycles)

Valid range: 1-100 cycles per instruction type.

**Note**: Latencies cannot be modified once the simulation has started. You must stop and reset to change them.

## Step 3: Start the Simulation

Once your instruction sequence is ready and latencies are configured, click the **"Start Simulation"** button. The interface will transition to simulation mode and display the following components:

### Simulation Interface Components

1. **Instruction Status Table**
   Tracks the progress of each instruction through the four pipeline stages. Each cell shows the cycle number when that stage completed, or is clickable if the stage is ready to execute.

2. **Functional Unit Status Table**
   Displays the state of all functional units:
   - **INTEGER1, INTEGER2**: Handle integer ALU operations and memory operations
   - **FP_ADDER**: Handles ADDD and SUBD operations
   - **FP_MULTIPLIER**: Handles MULTD operations
   - **FP_DIVIDER**: Handles DIVD operations

   For each unit, you can see:
   - **Busy**: Whether the unit is currently occupied
   - **Op**: The operation being performed
   - **Fi**: Destination physical register
   - **Fj, Fk**: Source physical registers
   - **Qj, Qk**: Functional units producing the source operands (if not ready)
   - **Rj, Rk**: Readiness flags for source operands
   - **Cycles**: Remaining execution cycles

3. **Register Rename Table**
   Shows the current mapping from architectural registers (R0-R15, F0-F15) to physical registers (P0-P63). This mapping updates dynamically as instructions are issued and register renaming occurs.

4. **Physical Register File**
   Displays the status of all 64 physical registers (P0-P63):
   - **P0-P15**: Initially mapped to R0-R15
   - **P16-P31**: Initially mapped to F0-F15
   - **P32-P63**: Initially free, allocated as needed

   Each register shows:
   - **Status**: Free, Busy (being written), or Ready (contains valid data)
   - **Architectural Register**: Which architectural register it's currently mapped to
   - **Instruction**: Which instruction is writing to it (if busy)
   - **Readers**: Number of instructions reading from it

5. **Execution Latency Configuration** (Read-Only)
   Displays the configured latencies for reference during simulation.

## Step 4: Advance Instructions Through Pipeline Stages

The core of the learning experience involves manually advancing instructions through the pipeline stages by clicking on cells in the **Instruction Status Table**. Instructions must progress through these stages in order:

### Stage 1: Issue

**What happens**:
- Checks for an available functional unit (structural hazard check)
- Performs register renaming:
  - Allocates a new physical register for the destination
  - Maps source registers through the rename table to find their physical registers
  - Updates the rename table to point the architectural destination to the new physical register
- Marks the functional unit as busy
- Sets up operand tracking (Qj, Qk, Rj, Rk flags)

**Constraints**:
- Instructions must issue **in program order** (cannot issue instruction N+1 until instruction N has issued)
- Requires an available functional unit of the appropriate type
- Cannot issue if no free physical registers are available

**Color coding**: Yellow = ready to issue, Gray = blocked by previous instruction, Red = no available functional unit

### Stage 2: Read Operands

**What happens**:
- Waits for source operands to become available in their physical registers
- Checks the Rj and Rk flags in the functional unit status
- Once both operands are ready, marks this stage as complete

**Constraints**:
- Cannot occur in the same cycle as Issue (must wait at least one cycle)
- Both source operands must be ready (Rj = true AND Rk = true)

**Color coding**: Yellow = ready to read, Gray = waiting for operands

### Stage 3: Execution Complete

**What happens**:
- Marks the execution as finished after the configured number of cycles have elapsed
- The functional unit's cycle counter decrements each cycle automatically
- When the counter reaches 0, this stage becomes available

**Constraints**:
- Must wait for the full execution latency to elapse
- Cannot complete execution in the same cycle as reading operands
- The functional unit must have cyclesRemaining = 0

**Color coding**: Yellow = execution finished (ready to mark complete), Gray = still executing

### Stage 4: Write Result

**What happens**:
- Writes the result to the destination physical register
- Updates the physical register status from "Busy" to "Ready"
- Notifies all waiting functional units that this operand is now available (updates their Rj/Rk flags)
- Frees the functional unit for use by other instructions
- Decrements reader counts on source physical registers
- Frees source physical registers if they have no more readers and are no longer mapped

**Constraints**:
- Execution must be complete
- With register renaming, there are **no WAR hazards** (unlike traditional scoreboarding)

**Color coding**: Yellow = ready to write, Gray = execution not complete

### Pending Actions

Actions that should be performed in the current cycle are highlighted in **yellow** in the Instruction Status Table. You must complete all pending actions before advancing to the next cycle using the **"Next Cycle"** button.

## Step 5: Use Hints and Learn from Feedback

The simulator provides several mechanisms to help you learn:

### Hint System

Click the **"Hint"** button at any time to receive suggestions about:
- Which actions should be performed in the current cycle
- Why certain actions are blocked
- What conditions need to be met to proceed

### Error Messages

If you attempt an invalid action, the simulator will:
- Block the action from executing
- Display a detailed error message explaining why it was blocked
- Provide information about what needs to happen first

Common error scenarios:
- Trying to issue out of order
- Attempting to read operands before they're ready
- Trying to complete execution before enough cycles have elapsed
- Structural hazards (no available functional unit)

### Visual Feedback

- **Green cells**: Stage completed
- **Yellow cells**: Action ready to perform (pending)
- **Gray cells**: Not yet ready (waiting for dependencies)
- **Red cells**: Blocked (e.g., structural hazard)

## Step 6: Observe Register Renaming Benefits

As you advance through the simulation, pay special attention to the **Register Rename Table** and **Physical Register File**:

### Eliminating WAW Hazards

When two instructions write to the same architectural register (e.g., `DADD R1, R2, R3` followed by `DSUB R1, R4, R5`), observe how:
- Each instruction gets a **different physical register** for R1
- The rename table is updated to point to the newer physical register
- The old physical register is freed once no instructions are reading from it
- Both instructions can execute in parallel without conflicts

### Eliminating WAR Hazards

When an instruction reads a register that a later instruction writes (e.g., `DADD R3, R1, R2` followed by `DSUB R1, R4, R5`), observe how:
- The first instruction reads from the **current physical register** mapped to R1
- The second instruction writes to a **new physical register** for R1
- The first instruction continues reading from the old physical register
- No conflict occurs, enabling out-of-order execution

### Physical Register Lifecycle

Watch how physical registers transition through states:
1. **Free**: Available for allocation
2. **Busy**: Allocated to an instruction, being written
3. **Ready**: Contains valid data, can be read
4. **Free again**: Released when no longer needed (no readers, not in rename table)

## Step 7: Complete the Simulation

Continue advancing instructions through all stages until every instruction has completed the **Write Result** stage.

### Analysis Questions

After completing the simulation, analyze the results:

1. **Performance**: How many cycles did it take to complete all instructions? How does this compare to sequential execution?

2. **Parallelism**: Which instructions executed in parallel? What enabled this parallelism?

3. **Hazard Elimination**: Identify cases where WAR or WAW hazards would have occurred without register renaming. How did renaming eliminate them?

4. **Resource Utilization**: Were there cycles where functional units were idle? Why?

5. **Register Pressure**: How many physical registers were needed? What happens if you run out of free physical registers?

### Experiment Variations

Try these variations to deepen your understanding:

- **Change latencies**: Make FP operations much slower and observe the impact
- **Add more instructions**: Create longer sequences with more dependencies
- **Create hazards intentionally**: Build sequences with WAR and WAW hazards
- **Vary instruction mix**: Try all integer operations, all FP operations, or mixed sequences
- **Test structural hazards**: Add more instructions than available functional units

Use the **"Restart Simulation"** button to run the same instruction sequence again, or **"Reset"** to start over with a new sequence.
