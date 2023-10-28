import React, { useState, useEffect } from 'react';
import { addDays, addMonths, isWeekend, format } from 'date-fns';
import './App.css';

function subtractWeekdays(date, days) {
  let current = new Date(date);
  while (days > 0) {
    current = addDays(current, -1);
    if (!isWeekend(current)) {
      days--;
    }
  }
  return current;
}

function addWeekdays(date, days) {
  let current = new Date(date);
  while (days > 0) {
    current = addDays(current, 1);
    if (!isWeekend(current)) {
      days--;
    }
  }
  return current;
}

function App() {
  const [electionDate, setElectionDate] = useState(null);
  const [communicationFromDate, setCommunicationFromDate] = useState(null);
  const [communicationToDate, setCommunicationToDate] = useState(null);
  const [publicationDate, setPublicationDate] = useState(null);
  const [claimFrom, setClaimFrom] = useState(null);
  const [claimTo, setClaimTo] = useState(null);
  const [depositOptions, setDepositOptions] = useState([]);

  useEffect(() => {
    if (electionDate) {
      const election = new Date(electionDate);

      // Comunicación
      setCommunicationFromDate(format(addDays(addMonths(election, -2), 1), 'dd/MM/yyyy'));
      setCommunicationToDate(format(subtractWeekdays(election, 15), 'dd/MM/yyyy'));

      // Publicación
      setPublicationDate(format(subtractWeekdays(election, 14), 'dd/MM/yyyy'));

      // Reclamo
      setClaimFrom(format(addWeekdays(election, 2), 'dd/MM/yyyy'));

      setClaimTo(format(addWeekdays(election, 15), 'dd/MM/yyyy'));

      // Depósito
      let depositDay = addDays(election, 2);
      const options = [];
      for (let i = 0; i < 5; i++) {
        while (isWeekend(depositDay)) {
          depositDay = addDays(depositDay, 1);
        }
        options.push(format(depositDay, 'dd/MM/yyyy'));
        depositDay = addDays(depositDay, 1);
      }
      setDepositOptions(options);
    }
  }, [electionDate]);

  return (
    <div className="App">
      <img src="background.jpg" alt="Banner" className="banner" />
      <h1>Simulador de fechas para elecciones</h1>

      <div className="election-date">
        <label>Fecha de Elección:</label>
        <div>
          <input type="date" onChange={(e) => setElectionDate(e.target.value)} />
          <button onClick={() => console.log('Calcular fechas')}>Calcular</button>
        </div>
      </div>

      {electionDate && (
        <>
          <h2>Fecha de Comunicación</h2>
          <div className="date-container">
            <div className="date-box">Desde: <strong>{communicationFromDate}</strong></div>
            <div className="date-box">Hasta: <strong>{communicationToDate}</strong></div>
          </div>

          <h2>Fecha de Publicación</h2>
          <div className="date-box">Día hábil siguiente: <strong>{publicationDate}</strong></div>

          <h2 className='TER'>Plazo para reclamar ante el TER</h2>
          <span className='TERspan'>Tribunal Electoral Regional</span>
          <div className="date-container TERcont">
            <div className="date-box">Desde: <strong>{claimFrom}</strong></div>
            <div className="date-box">Hasta: <strong>{claimTo}</strong></div>
          </div>

          <h2>Depósito de Documento de Elección</h2>
          <label>Selecione fecha: </label>
          <div className="selectContainer">
            <select>
              {depositOptions.map((date, index) => (
                <option key={index} value={date}>{date}</option>
              ))}
            </select>
          </div>

          <div className='submitDiv'>
            <button className='submitBtn'>Guardar en excel</button>
          </div>

        </>
      )}
    </div>
  );
}

export default App;