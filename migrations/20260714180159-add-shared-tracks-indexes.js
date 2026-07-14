'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex(
        'SharedTracks',
        [
          {
            name: 'createdAt',
            order: 'DESC',
          },
        ],
        {
          unique: false,
          name: 'sharedtrack_created_at_desc_idx',
          where: {
            deletedAt: null,
          },
          transaction,
        },
      );
      await queryInterface.addIndex(
        'SharedTracks',
        [
          'chat_id',
          {
            name: 'createdAt',
            order: 'DESC',
          },
        ],
        {
          unique: false,
          name: 'sharedtrack_chat_id_created_at_desc_idx',
          where: {
            deletedAt: null,
          },
          transaction,
        },
      );
      await queryInterface.addIndex(
        'SharedTracks',
        [
          {
            name: 'id',
            order: 'DESC',
          },
          {
            name: 'createdAt',
            order: 'DESC',
          },
        ],
        {
          unique: false,
          name: 'sharedtrack_id_desc_created_at_desc_idx',
          where: {
            deletedAt: null,
          },
          transaction,
        },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'SharedTracks',
        'sharedtrack_created_at_desc_idx',
        { transaction },
      );
      await queryInterface.removeIndex(
        'SharedTracks',
        'sharedtrack_chat_id_created_at_desc_idx',
        { transaction },
      );
      await queryInterface.removeIndex(
        'SharedTracks',
        'sharedtrack_id_desc_created_at_desc_idx',
        { transaction },
      );
    });
  },
};
