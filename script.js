document.addEventListener("DOMContentLoaded", () => {
    const algorithmSelect = document.getElementById("algorithm");
    const priorityInput = document.getElementById("priority-times");
    const quantumInput = document.getElementById("quantum");
  
    // Toggle visibility based on selected algorithm
    algorithmSelect.addEventListener("change", () => {
      const selected = algorithmSelect.value;
      if (selected === "RR") {
        quantumInput.parentElement.style.display = "block";
        priorityInput.parentElement.style.display = "none";
      } else if (selected.startsWith("Priority")) {
        quantumInput.parentElement.style.display = "none";
        priorityInput.parentElement.style.display = "block";
      } else {
        quantumInput.parentElement.style.display = "none";
        priorityInput.parentElement.style.display = "none";
      }
    });
  
    algorithmSelect.dispatchEvent(new Event("change")); // Initial visibility
  
    document.getElementById("solve-btn").addEventListener("click", () => {
      const at = document.getElementById("arrival-times").value.trim().split(/\s+/).map(Number);
      const bt = document.getElementById("burst-times").value.trim().split(/\s+/).map(Number);
      const ptRaw = document.getElementById("priority-times").value.trim();
      const pt = ptRaw ? ptRaw.split(/\s+/).map(Number) : [];
      const quantum = parseInt(document.getElementById("quantum").value);
      const algorithm = algorithmSelect.value;
  
      if (at.length !== bt.length || at.length === 0) {
        alert("Arrival and Burst times must be entered for all processes.");
        return;
      }
  
      const processes = at.map((a, i) => ({
        id: `P${i + 1}`,
        arrival: a,
        burst: bt[i],
        priority: pt[i] ?? 0
      }));
  
      let result;
      if (algorithm === "RR") {
        if (isNaN(quantum) || quantum <= 0) {
          alert("Please enter a valid Time Quantum.");
          return;
        }
        result = roundRobin(processes, quantum);
      } else if (algorithm === "Priority-NP") {
        result = priorityNonPreemptive(processes);
      } else if (algorithm === "Priority-P") {
        result = priorityPreemptive(processes);
      }
  
      displayResults(result.processes, result.timeline);
    });
  });
  
  // Round Robin Scheduling
  function roundRobin(processes, quantum) {
    let time = 0, queue = [], timeline = [], completed = [];
    processes = processes.map(p => ({ ...p, remaining: p.burst }));
    processes.sort((a, b) => a.arrival - b.arrival);
    let ready = [...processes];
  
    while (ready.length > 0 || queue.length > 0) {
      while (ready.length && ready[0].arrival <= time) queue.push(ready.shift());
  
      if (queue.length === 0) {
        time = ready[0].arrival;
        continue;
      }
  
      let curr = queue.shift();
      let start = time;
      let exec = Math.min(curr.remaining, quantum);
      time += exec;
      curr.remaining -= exec;
  
      timeline.push({ id: curr.id, start, end: time });
  
      while (ready.length && ready[0].arrival <= time) queue.push(ready.shift());
  
      if (curr.remaining > 0) queue.push(curr);
      else {
        curr.completion = time;
        curr.turnaround = curr.completion - curr.arrival;
        curr.waiting = curr.turnaround - curr.burst;
        completed.push(curr);
      }
    }
  
    return { processes: completed, timeline };
  }
  
  // Priority Non-Preemptive
  function priorityNonPreemptive(processes) {
    let time = 0, completed = [], timeline = [];
    let ready = processes.map(p => ({ ...p, completed: false }));
  
    while (completed.length < processes.length) {
      let available = ready.filter(p => p.arrival <= time && !p.completed);
      if (!available.length) {
        time++;
        continue;
      }
  
      let current = available.reduce((a, b) => (a.priority < b.priority ? a : b));
  
      current.start = time;
      current.completion = time + current.burst;
      current.turnaround = current.completion - current.arrival;
      current.waiting = current.turnaround - current.burst;
  
      timeline.push({ id: current.id, start: time, end: current.completion });
  
      time += current.burst;
      current.completed = true;
      completed.push(current);
    }
  
    return { processes: completed, timeline };
  }
  
  // Priority Preemptive
  function priorityPreemptive(processes) {
    let time = 0, timeline = [], completed = [];
    processes = processes.map(p => ({ ...p, remaining: p.burst }));
  
    while (completed.length < processes.length) {
      let available = processes.filter(p => p.arrival <= time && p.remaining > 0);
  
      if (!available.length) {
        time++;
        continue;
      }
  
      let current = available.reduce((a, b) => (a.priority < b.priority ? a : b));
  
      if (
        timeline.length === 0 ||
        timeline[timeline.length - 1].id !== current.id
      ) {
        timeline.push({ id: current.id, start: time });
      }
  
      current.remaining--;
      time++;
  
      if (current.remaining === 0) {
        current.completion = time;
        current.turnaround = current.completion - current.arrival;
        current.waiting = current.turnaround - current.burst;
        completed.push(current);
        timeline[timeline.length - 1].end = time;
      }
    }
  
    return { processes: completed, timeline };
  }
  
  // Display results and draw Gantt chart
  function displayResults(processes, timeline) {
    const tbody = document.querySelector("#result-table tbody");
    const ganttChart = document.getElementById("gantt-chart");
  
    tbody.innerHTML = "";
    ganttChart.innerHTML = "";
  
    let totalTAT = 0, totalWT = 0;
  
    // Fill result table
    processes.forEach(p => {
      totalTAT += p.turnaround;
      totalWT += p.waiting;
  
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.id}</td>
        <td>${p.arrival}</td>
        <td>${p.burst}</td>
        <td>${p.priority}</td>
        <td>${p.waiting}</td>
        <td>${p.turnaround}</td>
      `;
      tbody.appendChild(row);
    });
  
    // Create Gantt chart blocks
    const chartBar = document.createElement("div");
    chartBar.id = "chart";
  
    timeline.forEach(slot => {
      const block = document.createElement("div");
      block.classList.add("gantt-block");
      block.textContent = slot.id;
      chartBar.appendChild(block);
    });
  
    ganttChart.appendChild(chartBar);
  
    // Create timeline below the Gantt chart
    const timelineBar = document.createElement("div");
    timelineBar.id = "chart-timeline";
  
    timeline.forEach((slot, i) => {
      const timeMark = document.createElement("div");
      timeMark.textContent = slot.start;
      timelineBar.appendChild(timeMark);
  
      if (i === timeline.length - 1) {
        const finalMark = document.createElement("div");
        finalMark.textContent = slot.end;
        timelineBar.appendChild(finalMark);
      }
    });
  
    ganttChart.appendChild(timelineBar);
  
    // Display averages
    const avgRow = document.createElement("p");
    avgRow.id = "average";
    avgRow.innerHTML = `<b>Average Turnaround Time:</b> ${(totalTAT / processes.length).toFixed(2)} |
                        <b>Average Waiting Time:</b> ${(totalWT / processes.length).toFixed(2)}`;
    ganttChart.appendChild(avgRow);
  }
  