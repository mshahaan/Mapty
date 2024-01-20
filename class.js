'use strict';

// Global Vars
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Geolocation API: API that retrieves location info from browser and allows JS to use it
// To access: navigator.geolocation.getCurrentPosition(successFunc(position), errorFunc())
// successFunc() is called when the location is successfully retrieved and it is sent that as an arg
// errorFunc() is called when location was not retrieved

// The position arg sent in, which our function can simply return, is a GeolocationPosition object
// This object contains the coordinates of the location and a timestamp

class Workout {

    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {

        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
        
    }

    _setDescription(){

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;

    }
    
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {

        super(coords, distance, duration);
        this.cadence = cadence;

        this.calcPace();

        this._setDescription();
        
    }

    calcPace() {

        this.pace = this.duration / this.distance;
        return this.pace;

    }
    
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {

        super(coords, distance, duration);
        this.elevationGain = elevationGain;

        this.calcSpeed();

        this._setDescription();
        
    }

    calcSpeed() {

        this.speed = this.distance / (this.duration / 60);
        return this.speed;

    }
    
}

class App {

    #map;
    #mapEvent;
    #mapZoomLevel = 13;
    #workouts = [];

    constructor() {

        this._getPosition();

        this._getLocalStorage();

        form.addEventListener('submit', this._newWorkout.bind(this));
        
        inputType.addEventListener('change', this._toggleElevationField);

        containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
        
    }

    _getPosition(){

        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
            alert('Could not get your position.');
        });

    }

    _loadMap(position){

        const coords = [position.coords.latitude, position.coords.longitude];
    
    
        // The string param sent into L.map() must be the class of the HTML element where we want to display
        // our map. We have a div element in index.html with the class map.
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
    
    
        // Handling Click on Maps
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(curr => {
            this._renderWorkoutMarker(curr);
        });

    }

    _showForm(e){

        this.#mapEvent = e;
    
        form.classList.remove('hidden');
        inputDistance.focus();

    }

    _hideForm(){

        inputCadence.value = '';
        inputDistance.value = '';
        inputDuration.value = '';
        inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);

    }

    _toggleElevationField(){

        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

    }

    _newWorkout(e){

        function validInputs(...inputs){

            return inputs.every(current => Number.isFinite(current));
            
        }

        function allPositive(...inputs){

            return inputs.every(current => current > 0);

        }

        // Prevents default action of reloading on submit
        e.preventDefault();

        let workout;

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const coords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];

        if(type === 'running'){
            const cadence = +inputCadence.value;
            if(!validInputs(cadence, distance, duration) || !allPositive(distance, duration, cadence)){ 
                return alert('Inputs have to be positive numbers!'); 
            }

            workout = new Running(coords, distance, duration, cadence);
        } 
        
        if (type === 'cycling') {
            const elevationGain = +inputElevation.value;
            if(!validInputs(elevationGain, distance, duration) || !allPositive(distance, duration)){ 
                return alert('Inputs have to be positive numbers!'); 
            }

            workout = new Cycling(coords, distance, duration, elevationGain);
        }

        this.#workouts.push(workout);

        this._renderWorkoutMarker(workout);

        this._renderWorkout(workout);

        this._hideForm();

        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout){

        // Display Marker
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`)
            .openPopup();

    }

    _renderWorkout(workout){

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if(workout.type === 'running'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            `;
        }

        if(workout.type === 'cycling'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">spm</span>
                </div>
            `;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToMarker(event){

        const element = event.target.closest('.workout');

        if(!element) return;

        const workout = this.#workouts.find(function(current){

            return current.id === element.dataset.id

        });

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

    }

    _setLocalStorage() {

        localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    }

    _getLocalStorage() {

        const data = JSON.parse(localStorage.getItem('workouts'));

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(curr => {
            this._renderWorkout(curr);
        });

    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

}
