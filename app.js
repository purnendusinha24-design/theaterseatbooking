// patched minimal version

function refreshSummary(){
  const count = selectedSeats.size;
  const disabled = count===0;
  clearBtn.disabled = disabled;
  confirmBtn.disabled = disabled;
  mobileConfirmBtn.disabled = disabled;

  confirmBtn.classList.toggle("disabled", disabled);
  mobileConfirmBtn.classList.toggle("disabled", disabled);
}

function openBookingStep(context){
  if(selectedSeats.size===0){
    console.warn("Checkout attempted with no seats.");
    bookingOverlay.hidden = true;
    return;
  }
  bookingOverlay.hidden = false;
}

// rest omitted...
