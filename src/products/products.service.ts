import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid'
import { ProductImage } from './entities/product-image.entity';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImagesRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) { }

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      /**
       * Destructuring: extraer las imagenes del objeto y el resto de los datos en productDetails 
       * El operador se llama rest operator ya que se usa para extraer el resto de las propiedades 
       */
      const { images = [], ...productDetails } = createProductDto

      const product = this.productRepository.create({
        ...productDetails, //operador spread
        images: images.map(image => this.productImagesRepository.create({ url: image })),
        user: user
      });
      /*
        Como la operacion de guardado de imagenes se está haciendo dentro de la creacion de productos, no es necesario
        especificarle el producto al que pertenecen las imagenes. TypeORM se encarga de hacer el mapeo de las relaciones
      */
      await this.productRepository.save(product);
      return { ...product, images: images };
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    try {
      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: {
          images: true
        }
      });

      return products.map(product => ({
        ...product,
        images: product.images.map(image => image.url)
      }));
      /**
       * Si no especifico relations, las imagenes no se cargan ya que en la tabla
       * de productos no hay una columna que haga referencia a las imagenes.
       * La sintaxis {images: true} es para que cargue las imagenes de los productos. Si tuviera mas relaciones se pueden
       * especificar de la misma manera.
       */
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findOne(searchTermn: string) {
    let product: Product;
    if (isUUID(searchTermn)) {
      product = await this.productRepository.findOneBy({ id: searchTermn });
    } else {
      //Esto es un ejemplo de como hacer una busqueda por slug o title. Se puede hacer de cualquier manera
      //product = await this.productRepository.findOneBy({ slug: searchTermn })
      //Si queremos hacer una busqueda mas compleja, podemos usar el queryBuilder
      const queryBuilder = this.productRepository.createQueryBuilder();
      //La busqueda es case sensitive. 
      // product = await queryBuilder
      //   .where('title =:title or slug =:slug', {
      //     title: searchTermn,
      //     slug: searchTermn
      //   }).getOne();

      //Si se quiere hacer case insensitive, se debe hacer
      product = await queryBuilder
        .where('LOWER(title) = LOWER(:title) or LOWER(slug) = LOWER(:slug)', {
          title: searchTermn,
          slug: searchTermn
        })
        .leftJoinAndSelect('Product.images', 'images')
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with termn ${searchTermn} not found`);
    }
    return product;
  }

  async findeOnePlain(termn: string) {
    const {images = [], ...rest } = await this.findOne(termn);
    return {
      ...rest,
      images: images.map(image => image.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const {images, ...toUpdate } = updateProductDto;
    /**
     * Preload: Creates a new entity from the given plain javascript object. 
     * If entity already exist in the database then it loads it (and everything related to it), 
     * replaces all values with the new ones from the given object and returns this new entity.
    */
    const product = await this.productRepository.preload({
      id,
      ...toUpdate,
    });
    
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    //Create query runner to handle transactions. The database only applies the changes if the transaction is committed.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if(images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map(
          image => this.productImagesRepository.create({ url: image })
        );
      }

      product.user = user;
      
      await queryRunner.manager.save(product); //Esto no es el commit, es solo para guardar los cambios en la transaccion
      // return await this.productRepository.save(product); //Esto ya no se usa porque estamos con el queryRunner
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findeOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();  
      this.handleDbExceptions(error);
    }
  }

  async remove(id: string) {
    const productToDelete = await this.findOne(id);
    return await this.productRepository.remove(productToDelete);
  }

  //Esta funcion se va a usar solo cuadno cree la semilla de datos
  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute();
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error. Check server logs');
  }

}
