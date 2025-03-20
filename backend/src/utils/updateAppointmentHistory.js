const AppointmentModel = require("../model/appointment.model");

const updateAppointmentHistory = async (
  appointmentId,
  status,
  remarks = null
) => {
  try {
    const appointment = await AppointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Create a new history entry
    const historyEntry = {
      status,
      timestamp: new Date(),
      remarks,
    };

    // Push the new entry to the appointment history array
    appointment.appointmentHistory.push(historyEntry);

    // Save the updated appointment
    await appointment.save();
    return appointment;
  } catch (error) {
    console.error("Error updating appointment history:", error.message);
    throw error;
  }
};

module.exports = updateAppointmentHistory;
