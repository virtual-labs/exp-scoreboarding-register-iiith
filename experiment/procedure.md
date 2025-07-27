### Experiment Procedure ###

1. **Select Instruction Sequence**  
   Begin by selecting or entering a sequence of instructions using the provided input panel. Each instruction should use architectural registers for source and destination operands.

2. **Start the Simulation**  
   Once the instruction sequence is finalized, start the simulation. The interface will display the following key components:
   - **Instruction Status Table**: Tracks the progress of each instruction through the pipeline stages.
   - **Functional Unit Status Table**: Shows the availability, occupancy, and operand readiness of each functional unit.
   - **Register Status Table**: Indicates which physical unit is writing to each architectural register.
   - **Register Rename Table**: Displays the current mapping from architectural registers to physical registers, which updates dynamically as renaming occurs.

3. **Advance Instructions Manually**  
   The student manually advances instructions through the following stages by clicking the appropriate cells in the **Instruction Status Table**:
   - **Issue**
   - **Read Operands**
   - **Execution Complete**
   - **Write Result**

   Before advancing, students must consider functional unit availability, operand readiness, and renaming constraints. For example, if an architectural register is already mapped, a new physical register must be allocated to avoid WAW/WAR hazards.

4. **Receive Feedback and Hints**  
   If an incorrect action is taken (e.g., writing a result too early or using a physical register still in use), the simulator blocks the action and provides contextual hints explaining the hazard or violation.

5. **Visualize Renaming in Action**  
   As instructions are renamed and executed, observe how the Register Rename Table updates to reflect the current mappings. This helps visualize how renaming eliminates false dependencies and enables safe out-of-order execution.

6. **Complete the Simulation**  
   Continue until all instructions have completed the pipeline. Use the final state of the scoreboard and rename table to analyze how dependencies were managed and how the combination of scoreboarding and register renaming improved parallel execution.
