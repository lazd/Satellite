describe('Satellite game', function () {
  it('should exists', function () {
      expect(s).to.be.an('object');
      expect(s).to.have.property('config');
      expect(s).to.have.property('init');
  });

  it('should contains ship properties', function () {
    expect(s.config.ship).to.be.an('object');
    expect(s).to.have.deep.property('config.ship.hull');
    expect(s).to.have.deep.property('config.ship.shields');
    expect(s).to.have.deep.property('config.ship.maxSpeed');
  });

  it('should init game variables', function () {
    expect(s).to.have.property('projector').and.to.be.an('object');
    expect(s).to.have.property('loader').and.to.be.an('object');
    expect(s).to.have.property('game').and.to.be.an('object');
  });
});
