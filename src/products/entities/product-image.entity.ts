import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";

@Entity({name: 'product_images'})
export class ProductImage {

    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    url: string

    @ManyToOne(
        () => Product,
        (product) => product.images,
        {onDelete: 'CASCADE'} //If a product is deleted, all its images are also deleted!!!
    )
    product: Product;
}