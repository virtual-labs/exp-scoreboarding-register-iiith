In pipelined processors, instruction-level parallelism (ILP) is often limited by data hazards such as

- Read After Write (RAW),
- Write After Read (WAR), and
- Write After Write (WAW).

While scoreboarding is effective in dynamically managing instruction issue and execution by tracking resource and data dependencies, it does not eliminate all types of hazards—particularly the false dependencies (WAR and WAW) that arise due to register reuse.

**Register renaming** is a technique used to overcome these false dependencies by dynamically mapping logical (architectural) registers to a larger set of physical registers. Each instruction that writes to a register is assigned a new physical register, thereby breaking name-based conflicts with other instructions. This eliminates WAR and WAW hazards, allowing instructions to proceed without unnecessary stalls.

When combined with **scoreboarding**, this hybrid approach leverages the best of both techniques:

- The **scoreboard** tracks the status of functional units and the readiness of operands.
- The **renaming table** maintains mappings from logical to physical registers and tracks which instructions produce values for which registers.

This integration enables more aggressive **out-of-order execution**, greater instruction throughput, and better utilization of available resources.

The pipeline stages involved typically include:

1. **Instruction Issue**: Check for available functional unit and WAW hazards.
2. **Register Renaming**: Assign new physical registers to destination operands.
3. **Read Operands**: Wait until operands are available in physical registers.
4. **Execute**: Perform the operation.
5. **Write Result**: Update the physical register file.

By visualizing both the scoreboard and the renaming tables in action, students can understand how hazards are resolved and how modern processors achieve high ILP.
