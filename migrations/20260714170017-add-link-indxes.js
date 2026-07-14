'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('Links', ['type', 'provider', 'providerId'], {
      unique: false,
      name: 'links_type_provider_provider_id_idx',
    });
    await queryInterface.addIndex('Links', ['type', 'providerUrl'], {
      unique: false,
      name: 'links_type_provider_url_idx',
    });
    await queryInterface.addIndex('Links', ['provider', 'providerId'], {
      unique: false,
      name: 'links_provider_provider_id_idx',
    });
    await queryInterface.addIndex('Links', ['trackId', 'provider'], {
      unique: false,
      name: 'links_track_id_provider_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'Links',
      'links_type_provider_provider_id_idx',
    );
    await queryInterface.removeIndex('Links', 'links_type_provider_url_idx');
    await queryInterface.removeIndex('Links', 'links_provider_provider_id_idx');
    await queryInterface.removeIndex('Links', 'links_track_id_provider_idx');
  },
};
