'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex('Links', ['trackId'], {
        unique: false,
        name: 'links_track_id_idx',
        where: {
          deletedAt: null,
        },
        transaction,
      });
      await queryInterface.addIndex(
        'Links',
        ['type', 'provider', 'providerId'],
        {
          unique: false,
          name: 'links_type_provider_provider_id_idx',
          where: {
            deletedAt: null,
          },
          transaction,
        },
      );
      await queryInterface.addIndex('Links', ['type', 'providerUrl'], {
        unique: false,
        name: 'links_type_provider_url_idx',
        where: {
          deletedAt: null,
        },
        transaction,
      });
      await queryInterface.addIndex('Links', ['provider', 'providerId'], {
        unique: false,
        name: 'links_provider_provider_id_idx',
        where: {
          deletedAt: null,
        },
        transaction,
      });
      await queryInterface.addIndex('Links', ['trackId', 'provider'], {
        unique: false,
        name: 'links_track_id_provider_idx',
        where: {
          deletedAt: null,
        },
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('Links', 'links_track_id_idx', {
        transaction,
      });
      await queryInterface.removeIndex(
        'Links',
        'links_type_provider_provider_id_idx',
        { transaction },
      );
      await queryInterface.removeIndex('Links', 'links_type_provider_url_idx', {
        transaction,
      });
      await queryInterface.removeIndex(
        'Links',
        'links_provider_provider_id_idx',
        { transaction },
      );
      await queryInterface.removeIndex('Links', 'links_track_id_provider_idx', {
        transaction,
      });
    });
  },
};
