import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ProductImage } from "./product-image.entity";
import { User } from "src/auth/entities/user.entity";
import { use } from "passport";
import { ApiProperty } from "@nestjs/swagger";

//La entidad es una clase que representa una tabla en la base de datos. 
@Entity({name: 'products'})
export class Product {
    @ApiProperty({
        example: '0260e30c-2723-4485-bfde-ffc0a8fc1696',
        description: 'ProductId',
        uniqueItems: true
    }) //Es para la documentacion
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty()
    @Column('text', {
        unique: true
    })
    title: string;

    @ApiProperty()
    @Column('float', {
        default: 0
    })
    price: number;

    @ApiProperty()
    @Column({
        type: 'text',
        nullable: true
    })
    description: string;

    @ApiProperty()
    @Column('text', {
        unique: true
    })
    //The slug is a URL-friendly version of the title, which is used to create SEO-friendly URLs.
    slug: string;

    @ApiProperty()
    @Column('int', {
        default: 0
    })
    stock: number;

    @ApiProperty()
    @Column('text', {
        array: true
    })
    sizes: string[];

    @ApiProperty()
    @Column('text')
    gender: string;

    @ApiProperty()
    @Column('text',{
        array: true,
        default: []
    })
    tags: string[];

    @OneToMany(
        () => ProductImage,
        (productImage) => productImage.product,
        {cascade: true, eager: true} //eager: each time we fetch a product, we also want to fetch its images
    )
    images?: ProductImage[]

    @ManyToOne(
        () => User,
        (user) => user.product,
        { eager: true }
    )
    user: User

    @BeforeInsert()
    checkSlugInsert() {
        if(!this.slug) {
            this.slug = this.title
        }
        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ', '_')
            .replaceAll("'", '');
    }

    @BeforeUpdate()
    checkSlugUpdate() {
        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ', '_')
            .replaceAll("'", '');
    }
}
