let memorySize = 0;
let osSize = 0;
let remainingMemory = 0;
let partitions = [];
let partitionCount = 0;
let waitingList = [];
let lostMemoryStack = [];

// Escuchar cambios en memoria y SO
document.getElementById('memorySize').addEventListener('input', updateMemory);
document.getElementById('osSize').addEventListener('input', updateOS);

function updateMemory() {
    let memoryInput = document.getElementById('memorySize').value;
    let memoryUnit = document.getElementById('memoryUnit').value;
    memorySize = convertToKB(memoryInput, memoryUnit);
    remainingMemory = memorySize - osSize;
    updateRemainingMemoryLabel();
    generateChart();
}

function updateOS() {
    let osInput = document.getElementById('osSize').value;
    let osUnit = document.getElementById('osUnit').value;
    osSize = convertToKB(osInput, osUnit);

    // Validar que el sistema operativo no exceda el 30% de la memoria total
    if (osSize > memorySize * 0.30) {
        alert("El tamaño del sistema operativo no puede exceder el 30% de la memoria total.");
        osSize = 0; // Restablecer el tamaño del sistema operativo
        document.getElementById('osSize').value = ''; // Borrar el input para evitar confusión
        return;
    }

    // Actualizar memoria restante
    remainingMemory = memorySize - osSize;
    generateChart();
    updateRemainingMemoryLabel();
}

function addJob() {
    let jobName = document.getElementById('jobName').value;
    let jobSize = parseFloat(document.getElementById('jobSize').value);
    let jobUnit = document.getElementById('jobUnit').value.toLowerCase();

    if (isNaN(jobSize)) {
        alert("Por favor ingresa un tamaño válido para el trabajo.");
        return;
    }

    let jobSizeInKB = convertToKB(jobSize, jobUnit);

    // Verificar si el trabajo ya existe y liberarlo
    let existingJob = partitions.find(partition => partition.job && partition.job.name === jobName);
    if (existingJob) {
        let partitionIndex = partitions.indexOf(existingJob);
        remainingMemory += existingJob.job.size;
        lostMemoryStack[partitionIndex] = 0;
        existingJob.job = null;

        alert(`El trabajo "${jobName}" ha sido liberado.`);
        processWaitingList(); // Revisar lista de espera cuando se libera un trabajo
        generateChart();
        updateRemainingMemoryLabel();
        updateLostMemoryLabel();
        updateLostMemory();
        return;
    }

    // Intentar asignar el trabajo en una partición libre
    let jobAssigned = false;
    for (let partition of partitions) {
        if (!partition.job && partition.size >= jobSizeInKB) {
            partition.job = { name: jobName, size: jobSizeInKB };
            remainingMemory -= jobSizeInKB;
            lostMemoryStack[partitions.indexOf(partition)] = partition.size - jobSizeInKB;
            jobAssigned = true;
            break;
        }
    }

    // Si no se asignó, agregar a la lista de espera
    if (!jobAssigned) {
        waitingList.push({ name: jobName, size: jobSizeInKB });
        alert(`No hay espacio disponible para el trabajo "${jobName}". Se agregó a la lista de espera.`);
    }

    generateChart();
    updateRemainingMemoryLabel();
    updateWaitingList();
    updateLostMemory();
    updateLostMemoryLabel();
}

// Función para procesar la lista de espera cuando una partición se libera
function processWaitingList() {
    if (waitingList.length > 0) {
        let nextJob = waitingList.shift();
        addJobFromWaitingList(nextJob);
    }
}
function updateWaitingList() {
    const waitingListContainer = document.getElementById('waitingList');
    waitingListContainer.innerHTML = ''; // Limpiar la lista de espera actual

    if (waitingList.length === 0) {
        waitingListContainer.textContent = "No hay trabajos en lista de espera.";
        return;
    }

    waitingList.forEach(job => {
        let jobElement = document.createElement('div');
        jobElement.textContent = `Trabajo: ${job.name}, Tamaño: ${job.size} KB`;
        jobElement.style.marginBottom = '5px';
        jobElement.style.backgroundColor = '#e74c3c';
        jobElement.style.padding = '5px';
        jobElement.style.borderRadius = '5px';
        waitingListContainer.appendChild(jobElement);
    });
}

function addJobFromWaitingList(job) {
    for (let partition of partitions) {
        if (!partition.job && partition.size >= job.size) {
            partition.job = job;
            remainingMemory -= job.size;
            lostMemoryStack[partitions.indexOf(partition)] = partition.size - job.size;
            alert(`El trabajo "${job.name}" de la lista de espera ha sido asignado.`);
            break;
        }
    }
    generateChart();
    updateRemainingMemoryLabel();
    updateWaitingList();
    updateLostMemory();
    updateLostMemoryLabel();
}

// Asegúrate de que updateWaitingList esté implementada para mostrar la lista de espera actual


function updateRemainingMemoryLabel() {
    const remainingMemoryMB = (remainingMemory / 1024).toFixed(2);
    document.getElementById('remainingMemoryLabel').textContent = `${remainingMemory} KB (${remainingMemoryMB} MB)`;
}


function generateChart() {
    let memoryGrid = document.getElementById('memoryGrid');
    memoryGrid.innerHTML = '';

    // Bloque para el sistema operativo
    let osBlock = document.createElement('div');
    osBlock.textContent = 'Sistema Operativo';
    osBlock.style.backgroundColor = 'red';
    osBlock.style.width = `${(osSize / memorySize) * 100}%`;
    osBlock.style.height = '50px';
    osBlock.style.border = '1px solid black';
    memoryGrid.appendChild(osBlock);

    // Crear bloques para las particiones
    partitions.forEach((partition, index) => {
        let partitionBlock = document.createElement('div');
        partitionBlock.style.width = `${(partition.size / memorySize) * 100}%`;
        partitionBlock.style.height = '50px';
        partitionBlock.style.border = '1px solid black';
        partitionBlock.style.display = 'flex';

        if (partition.job) {
            // Bloque para el trabajo asignado dentro de la partición
            let jobBlock = document.createElement('div');
            jobBlock.textContent = `${partition.job.name}`;
            jobBlock.style.backgroundColor = 'yellow';
            jobBlock.style.width = `${(partition.job.size / partition.size) * 100}%`;
            jobBlock.style.height = '100%';
            jobBlock.style.display = 'inline-block';
            partitionBlock.appendChild(jobBlock);

            // Bloque para el espacio perdido en la partición
            let lostSpace = partition.size - partition.job.size;
            if (lostSpace > 0) {
                let remainingBlock = document.createElement('div');
                remainingBlock.style.backgroundColor = 'lightblue';
                remainingBlock.style.width = `${(lostSpace / partition.size) * 100}%`;
                remainingBlock.style.height = '100%';
                remainingBlock.style.display = 'inline-block';
                partitionBlock.appendChild(remainingBlock);
            }
        } else {
            // Si la partición está libre, se pinta como espacio disponible
            partitionBlock.style.backgroundColor = 'lightblue';
            partitionBlock.textContent = `Partición ${index + 1}`;
        }

        memoryGrid.appendChild(partitionBlock);
    });
}

function updateLostMemory() {
    let lostMemoryContainer = document.getElementById('lostMemory');
    lostMemoryContainer.innerHTML = '';

    lostMemoryStack.forEach((memory, index) => {
        if (memory > 0) {
            let memoryBlock = document.createElement('div');
            memoryBlock.textContent = `Partición ${index + 1}: ${memory} KB perdidos`;
            memoryBlock.style.backgroundColor = 'orange';
            memoryBlock.style.border = '1px solid black';
            memoryBlock.style.marginBottom = '5px';
            lostMemoryContainer.appendChild(memoryBlock);
        }
    });
}

function updateLostMemoryLabel() {
    const totalLostMemory = lostMemoryStack.reduce((acc, val) => acc + val, 0);
    const totalLostMemoryMB = (totalLostMemory / 1024).toFixed(2);
    document.getElementById('lostMemoryLabel').textContent = `${totalLostMemory} KB (${totalLostMemoryMB} MB)`;
}

// Llama a estas funciones después de asignar un trabajo o liberar uno:
generateChart();
updateRemainingMemoryLabel();
updateWaitingList();
updateLostMemory();
updateLostMemoryLabel();

function convertToKB(value, unit) {
    if (unit === 'giga') return value * 1024 * 1024;
    if (unit === 'mega') return value * 1024;
    return value;
}

function requestNextPartition() {
    if (remainingMemory <= 0) {
        alert("No hay suficiente memoria disponible para más particiones.");
        return;
    }

    // Pedir el tamaño de la partición con un prompt
    let partitionSize = parseFloat(prompt(`Ingresa el tamaño de la partición ${partitionCount + 1}:`));
    if (isNaN(partitionSize) || partitionSize <= 0) {
        alert("Por favor ingresa un número válido para el tamaño de la partición.");
        return;
    }

    // Pedir la unidad de la partición
    let partitionUnit = prompt("Ingresa la unidad (giga, mega o kilo):").toLowerCase();
    if (!['giga', 'mega', 'kilo'].includes(partitionUnit)) {
        alert("Unidad no válida. Por favor ingresa giga, mega o kilo.");
        return;
    }

    let partitionSizeInKB = convertToKB(partitionSize, partitionUnit);

    // Verificar si la partición cabe en la memoria restante
    if (partitionSizeInKB > remainingMemory) {
        alert("El tamaño de la partición excede la memoria disponible.");
        return;
    }

    // Crear y almacenar la partición
    partitions.push({ size: partitionSizeInKB });
    remainingMemory -= partitionSizeInKB;
    partitionCount++;

    // Actualizar los labels y la gráfica
    updateRemainingMemoryLabel();
    generateChart();

    setTimeout(() => {
        const remainingMemoryMB = (remainingMemory / 1024).toFixed(2);
        alert(`Partición ${partitionCount} añadida. Espacio sobrante: ${remainingMemory} KB (${remainingMemoryMB} MB)`);
        
        // Si todavía hay memoria disponible, preguntar si desea agregar otra partición
        if (remainingMemory > 0) {
            requestNextPartition();
        }
    }, 0);
}