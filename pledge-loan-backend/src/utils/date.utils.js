/**
 * Force Noon (12:00:00) to prevent Timezone Rollback issues across clients and servers.
 */
const parseDate = (dateInput) => {
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
};

module.exports = {
  parseDate
};