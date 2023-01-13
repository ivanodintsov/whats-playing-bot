import { Test, TestingModule } from '@nestjs/testing';
import { ImportDbController } from './import-db.controller';

describe('ImportDbController', () => {
  let controller: ImportDbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportDbController],
    }).compile();

    controller = module.get<ImportDbController>(ImportDbController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
