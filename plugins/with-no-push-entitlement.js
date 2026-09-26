// expo-notifications adds the Push Notifications entitlement (aps-environment) to iOS
// builds. This app only schedules *local* notifications (the rest timer), which don't need
// it, and free Apple accounts can't sign apps that have it. Remove it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
