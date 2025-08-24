<style>
/* Estilos para o container flutuante */
#floating-radio-player {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999;
    padding: 10px 15px;
    background-color: #1a1a1a;
    border-radius: 0 0 10px 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 10px;
}

/* Estilos para o menu de seleção de rádio */
#radio-selector {
    padding: 8px 10px;
    border: 1px solid #333;
    border-radius: 5px;
    font-size: 1em;
    background-color: #333;
    color: #f5f5f5;
}

/* Estilos para o player de áudio */
#dynamic-audio-player {
    width: 250px;
}
</style>

<div id="floating-radio-player">
    <select id="radio-selector"></select>
    <audio id="dynamic-audio-player" controls autoplay></audio>
</div>

<script>
// Lista de estações de rádio ajustada
const radioStations = {
    '🇧🇷 Rádio Atlântida': 'https://playerservices.streamtheworld.com/api/livestream-redirect/ATL_FLO.mp3',
    '🇩🇪 Rádio Classic Rock Live': 'http://stream.antenne.de:80/classic-rock-live',
    '🇩🇪 Rádio Gay FM': 'https://icepool.silvacast.com/GAYFM.mp3',
    '🇺🇸 Rádio Paradise': 'http://stream.radioparadise.com/mp3-128'
};

document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('radio-selector');
    const audioPlayer = document.getElementById('dynamic-audio-player');
    const stationNames = Object.keys(radioStations).sort();

    for (let i = 0; i < stationNames.length; i++) {
        const name = stationNames[i];
        const option = document.createElement('option');
        option.value = radioStations[name];
        option.textContent = name;
        selector.appendChild(option);
    }
    
    audioPlayer.src = radioStations['🇧🇷 Rádio Atlântida'];
    selector.value = audioPlayer.src;

    audioPlayer.play().catch(error => {
        console.log("Autoplay da rádio padrão bloqueado. O usuário precisa clicar no play.");
    });

    selector.addEventListener('change', (event) => {
        const selectedUrl = event.target.value;
        if (selectedUrl) {
            audioPlayer.src = selectedUrl;
            
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay bloqueado. O usuário precisa clicar no play.");
                });
            }
        }
    });
});
</script>
