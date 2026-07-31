'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'PlaybackQueue',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            unique: true,
          },
          service: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          providerUserId: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          currentIndex: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: -1,
          },
          queueList: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction },
      );

      await queryInterface.addIndex(
        'PlaybackQueue',
        ['service', 'providerUserId'],
        {
          name: 'playback_queue_service_provider_user_id_idx',
          transaction,
          unique: true,
        },
      );
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'PlaybackQueue',
        'playback_queue_service_provider_user_id_idx',
        { transaction },
      );
      await queryInterface.dropTable('PlaybackQueue', {
        transaction,
      });
    });
  },
};
